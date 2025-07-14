/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    return (sale_price * quantity) * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    }
    if (index <= 2) {
        return profit * 0.1;
    }
    if (index !== total - 1) {
        return profit * 0.05;
    }
    return 0;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue ||
        !calculateBonus ||
        typeof calculateRevenue !== "function" ||
        typeof calculateBonus !== "function") {
        throw new Error('Чего-то не хватает');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = sellerStats.reduce((result, item) => ({
        ...result,
        [item.id]: item
    }), {});
    const productIndex = data.products.reduce((result, item) => ({
        ...result,
        [item.sku]: item
    }), {}); // Ключом будет sku, значением — запись из data.products 

    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item);
            const profit = revenue - cost;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        let data = Object.entries(seller.products_sold).map(x => ({ sku: x[0], quantity: x[1] }));
        data.sort((a, b) => b.quantity - a.quantity);
        seller.top_products = data.slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: +seller.sales_count.toFixed(0),
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
}));
}