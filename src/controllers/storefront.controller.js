// controllers/storefront.controller.js
const productService = require('../services/product.service');

/**
 * Xử lý lỗi dịch vụ chung
 */
const handleServiceError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Storefront error:', error);
    const payload = { error: 'Lỗi server khi xử lý yêu cầu' };
    if (process.env.NODE_ENV !== 'production') {
        payload.detail = error?.message || String(error);
    }
    res.status(500).json(payload);
};

// GET: Lấy danh sách sản phẩm công khai (Storefront) với phân trang/lọc/sắp xếp
exports.getProducts = async (req, res) => {
    try {
        const {
            page = '1',
            limit = '12',
            sortBy = 'ten_san_pham',
            sortOrder = 'asc',
            q,
            category,
            priceRange,
            inStock = 'false'
        } = req.query;

        // Xử lý priceRange nếu có
        let minPrice, maxPrice;
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            minPrice = min;
            maxPrice = max;
        }

        // Dùng field danh_muc trực tiếp để lọc
        const categoryField = category ? String(category).toLowerCase() : undefined;

        // Synonyms for smart search (accent-insensitive approximations)
        const buildSynonyms = (text) => {
            if (!text) return [];
            const t = String(text).toLowerCase();
            const map = [
                { keys: ['mi tom','mì tôm','mì tôm chua cay','hao hao','hảo hảo','omachi','3 mien','3 miền','mi ','mì '], add: ['mì', 'mi'] },
                { keys: ['do uong','đồ uống','nuoc ngot','nước ngọt','coca','pepsi','7up','number one'], add: ['đồ uống','nước ngọt'] },
                { keys: ['banh keo','bánh kẹo','snack','oishi','poca','oreo','chocopie'], add: ['bánh', 'snack'] },
                { keys: ['sua','sữa','vinamilk','yakult','yogurt'], add: ['sữa'] },
                { keys: ['ca phe','cà phê','coffee','g7'], add: ['cà phê'] }
            ];
            let result = [];
            for (const m of map) {
                if (m.keys.some(k => t.includes(k))) {
                    result = result.concat(m.add);
                }
            }
            return Array.from(new Set(result));
        };

        const nameKeywords = q ? buildSynonyms(q) : undefined;

        // Xử lý sortBy mapping
        let mappedSortBy = sortBy;
        if (sortBy === 'name') mappedSortBy = 'ten_san_pham';
        else if (sortBy === 'price') mappedSortBy = 'gia_ban';
        else if (sortBy === 'stock') mappedSortBy = 'so_luong';

        const options = {
            page: Number(page),
            limit: Number(limit),
            sortBy: mappedSortBy,
            sortOrder: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc',
            q: q?.toString(),
            minPrice,
            maxPrice,
            inStock: inStock === 'true',
            category: categoryField,
            nameKeywords
        };

        const result = await productService.getAllProducts(false, options);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// GET: Lấy chi tiết sản phẩm công khai (Storefront)
exports.getProductDetail = async (req, res) => {
    try {
        const product = await productService.getProductDetail(req.params.id, false);
        res.json(product);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// GET: Gợi ý tìm kiếm sản phẩm theo từ khóa
exports.getSuggestions = async (req, res) => {
    try {
        const { q = '' } = req.query;
        const suggestions = await productService.getSuggestions(String(q));
        res.json({ items: suggestions });
    } catch (error) {
        handleServiceError(res, error);
    }
};