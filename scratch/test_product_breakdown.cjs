const supabase = require('./server/src/config/supabase')
const { slugify } = require('./server/src/utils/slugify') || {}

async function run() {
  console.log('--- MEASURING SUPABASE BACKEND QUERIES ---')
  
  // 1. Categories lookup
  const t1 = performance.now()
  const { data: cat } = await supabase
    .from('categories')
    .select('id, slug')
    .limit(1)
    .maybeSingle()
  console.log(`[PERF] category lookup: ${(performance.now() - t1).toFixed(1)} ms`)

  // 2. Display order
  const t2 = performance.now()
  const { data: orderData } = await supabase
    .from('products')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
  console.log(`[PERF] display_order lookup: ${(performance.now() - t2).toFixed(1)} ms`)

  // 3. Slug check
  const t3 = performance.now()
  const baseSlug = 'test-perf-product'
  const { data: slugData } = await supabase
    .from('products')
    .select('id, slug')
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`)
  console.log(`[PERF] slug check query: ${(performance.now() - t3).toFixed(1)} ms`)

  // 4. Parallel execution of the 3 independent queries
  const tParallel = performance.now()
  const [cRes, oRes, sRes] = await Promise.all([
    supabase.from('categories').select('slug').eq('id', cat.id).maybeSingle(),
    supabase.from('products').select('display_order').order('display_order', { ascending: false }).limit(1),
    supabase.from('products').select('id, slug').or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`)
  ])
  console.log(`[PERF] 3 queries PARALLEL: ${(performance.now() - tParallel).toFixed(1)} ms`)
}

run().catch(console.error)
