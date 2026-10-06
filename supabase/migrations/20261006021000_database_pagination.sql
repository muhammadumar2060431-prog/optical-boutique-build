BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE FUNCTION public.admin_record_page_v1(p_kind text,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0,
  p_search text DEFAULT '',p_status text DEFAULT 'all',p_source text DEFAULT 'all',p_collection text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE records_sql text; result jsonb; needle text;
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    OR length(p_search)>120 THEN RAISE EXCEPTION 'INVALID_PAGE'; END IF;
  needle := '%' || replace(replace(replace(COALESCE(p_search,''),E'\\',E'\\\\'), '%', E'\\%'),'_',E'\\_') || '%';
  IF p_kind='products' THEN
    SELECT jsonb_build_object('rows',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM (
      SELECT * FROM public.products p WHERE (needle='%%' OR (COALESCE(p.name,'')||' '||COALESCE(p.sku,'')) ILIKE needle ESCAPE E'\\')
      AND (p_source='all' OR p.category_id=p_source) AND (p_collection='all' OR p_collection=ANY(p.collection_ids))
      AND (p_status='all' OR CASE WHEN p.enabled THEN 'Published' ELSE 'Draft' END=p_status)
      ORDER BY p.created_at DESC NULLS LAST,p.id DESC LIMIT p_limit OFFSET p_offset) r),'[]'::jsonb),
      'total',(SELECT count(*) FROM public.products p WHERE (needle='%%' OR (COALESCE(p.name,'')||' '||COALESCE(p.sku,'')) ILIKE needle ESCAPE E'\\')
      AND (p_source='all' OR p.category_id=p_source) AND (p_collection='all' OR p_collection=ANY(p.collection_ids))
      AND (p_status='all' OR CASE WHEN p.enabled THEN 'Published' ELSE 'Draft' END=p_status))) INTO result;
    RETURN result;
  END IF;
  CASE p_kind
    WHEN 'orders' THEN records_sql := $q$SELECT to_jsonb(o) AS row,o.id,o.created_at,o.status,o.source,
      COALESCE(o.customer_name,'')||' '||COALESCE(o.product_name,'')||' '||COALESCE(o.reference,'') AS search
      FROM public.orders o WHERE o.deleted_at IS NULL AND o.source<>'form'$q$;
    WHEN 'queries' THEN records_sql := $q$SELECT to_jsonb(q) AS row,q.id,q.created_at,q.status,'form'::text AS source,
      COALESCE(q.name,'')||' '||COALESCE(q.contact,'')||' '||COALESCE(q.product_name,'')||' '||COALESCE(q.message,'') AS search
      FROM public.queries q WHERE q.deleted_at IS NULL
      UNION ALL SELECT to_jsonb(o)||jsonb_build_object('name',o.customer_name,'contact',o.phone,'message',o.address,
      'status',CASE WHEN o.status IN ('Responded','Archived') THEN o.status ELSE 'New' END),o.id,o.created_at,
      CASE WHEN o.status IN ('Responded','Archived') THEN o.status ELSE 'New' END,'form',
      COALESCE(o.customer_name,'')||' '||COALESCE(o.phone,'')||' '||COALESCE(o.product_name,'')||' '||COALESCE(o.address,'')
      FROM public.orders o WHERE o.deleted_at IS NULL AND o.source='form'
        AND NOT EXISTS(SELECT 1 FROM public.queries q WHERE q.id=o.id)$q$;
    WHEN 'subscribers' THEN records_sql := $q$SELECT to_jsonb(s) AS row,s.id,s.created_at,s.status,'newsletter'::text AS source,s.email AS search FROM public.subscribers s$q$;
    WHEN 'inventory' THEN records_sql := $q$SELECT * FROM public.inventory_records_v1()$q$;
    ELSE RAISE EXCEPTION 'INVALID_PAGE';
  END CASE;
  EXECUTE 'WITH records AS ('||records_sql||'), matched AS (
    SELECT * FROM records WHERE ($1=''%%'' OR search ILIKE $1 ESCAPE E''\\'')
      AND ($2=''all'' OR status=$2) AND ($3=''all'' OR source=$3)),
    page AS (SELECT row FROM matched ORDER BY created_at DESC NULLS LAST,id DESC LIMIT $4 OFFSET $5)
    SELECT jsonb_build_object(''rows'',COALESCE((SELECT jsonb_agg(row) FROM page),''[]''::jsonb),
      ''total'',(SELECT count(*) FROM matched))'
    INTO result USING needle,COALESCE(p_status,'all'),COALESCE(p_source,'all'),p_limit,p_offset;
  RETURN result;
END $$;
CREATE FUNCTION public.inventory_records_v1()
RETURNS TABLE("row" jsonb,id text,created_at timestamptz,status text,source text,search text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH entries AS (
    SELECT p.*,v.item,
      COALESCE((v.item->>'stock')::integer,p.stock,0) AS quantity,
      COALESCE((SELECT low_stock_threshold FROM public.store_settings WHERE id='default'),3) AS threshold,
      COALESCE(c.name,'-') AS category_name
    FROM public.products p LEFT JOIN public.categories c ON c.id=p.category_id
    LEFT JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END) v(item) ON true
    WHERE public.is_admin()
  ) SELECT jsonb_build_object('key',id||':'||COALESCE(item->>'id','base'),'productId',id,'variantId',item->>'id',
      'categoryName',category_name,'name',name||CASE WHEN item IS NULL THEN '' ELSE ' - '||COALESCE(item->>'label','') END,
      'image',images[1],'stock',quantity,'status',CASE WHEN quantity<=0 THEN 'Out of stock' WHEN quantity<=threshold THEN 'Low stock' ELSE 'In stock' END,
      'updatedAt',COALESCE(updated_at,created_at),'product',to_jsonb(entries)-'item'-'quantity'-'threshold'-'category_name'),
    id||':'||COALESCE(item->>'id','base'),created_at,
    CASE WHEN quantity<=0 THEN 'Out of stock' WHEN quantity<=threshold THEN 'Low stock' ELSE 'In stock' END,
    category_name,name||' '||COALESCE(item->>'label','') FROM entries;
$$;
REVOKE ALL ON FUNCTION public.inventory_records_v1() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.admin_dashboard_stats_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('products',(SELECT count(*) FROM public.products),'categories',(SELECT count(*) FROM public.categories),
    'stockAlerts',(SELECT count(*) FROM public.inventory_records_v1() WHERE status<>'In stock'),
    'newOrders',(SELECT count(*) FROM public.orders WHERE deleted_at IS NULL AND source<>'form' AND status='New' AND created_at>=now()-interval '24 hours'),
    'recentOrders',(SELECT COALESCE(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM (
      SELECT * FROM public.orders WHERE deleted_at IS NULL AND source<>'form' AND created_at>=now()-interval '24 hours'
      ORDER BY created_at DESC,id DESC LIMIT 6) r));
END $$;
CREATE FUNCTION public.catalog_product_page_v1(p_category text DEFAULT NULL,p_collection text DEFAULT NULL,
  p_min numeric DEFAULT NULL,p_max numeric DEFAULT NULL,p_sort text DEFAULT 'newest',p_limit integer DEFAULT 12,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    OR p_sort NOT IN ('newest','price-asc','price-desc') OR p_min<0 OR p_max<0 THEN RAISE EXCEPTION 'INVALID_PAGE'; END IF;
  WITH matched AS (SELECT * FROM public.products WHERE enabled=true
    AND (p_category IS NULL OR category_id=p_category) AND (p_collection IS NULL OR p_collection=ANY(collection_ids))
    AND (p_min IS NULL OR price>=p_min) AND (p_max IS NULL OR price<=p_max)),
  page AS (SELECT * FROM matched ORDER BY CASE WHEN p_sort='price-asc' THEN price END ASC,
    CASE WHEN p_sort='price-desc' THEN price END DESC,created_at DESC NULLS LAST,id DESC LIMIT p_limit OFFSET p_offset)
  SELECT jsonb_build_object('rows',COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb),'total',(SELECT count(*) FROM matched)) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_record_page_v1(text,integer,integer,text,text,text,text),public.admin_dashboard_stats_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_record_page_v1(text,integer,integer,text,text,text,text),public.admin_dashboard_stats_v1() TO authenticated;
REVOKE ALL ON FUNCTION public.catalog_product_page_v1(text,text,numeric,numeric,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_product_page_v1(text,text,numeric,numeric,text,integer,integer) TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
