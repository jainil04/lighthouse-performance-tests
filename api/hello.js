export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.vercel.app/products');
    const products = await response.json();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}