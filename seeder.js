/**
 * CLI: node seeder.js -i   (import seed data)
 *       node seeder.js -d   (remove seeded categories & products)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const Category = require('./models/category.model');
const Product = require('./models/product.model');
const seedData = require('./data');

const connect = async () => {
    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI is not set in .env');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected for seeder');
};

const importData = async () => {
    await connect();
    try {
        const categoryNames = seedData.categories.map((c) => c.name);
        const existingCats = await Category.countDocuments({
            name: { $in: categoryNames }
        });
        if (existingCats > 0) {
            console.error(
                '❌ Seed categories already exist. Run `node seeder.js -d` first, then import again.'
            );
            process.exitCode = 1;
            await mongoose.connection.close();
            return;
        }

        const categoryKeyToId = new Map();

        for (const cat of seedData.categories) {
            const { key, ...rest } = cat;
            const created = await Category.create(rest);
            categoryKeyToId.set(key, created._id);
            console.log(`  + Category: ${rest.name}`);
        }

        for (const p of seedData.products) {
            const categoryId = categoryKeyToId.get(p.categoryKey);
            if (!categoryId) {
                console.warn(`  ! Skip product (unknown categoryKey): ${p.name}`);
                continue;
            }
            const { categoryKey, ...productFields } = p;
            await Product.create({
                ...productFields,
                category: categoryId
            });
            console.log(`  + Product: ${p.name}`);
        }

        console.log('✅ Import completed');
    } catch (err) {
        console.error('❌ Import failed:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

const destroyData = async () => {
    await connect();
    try {
        const categoryNames = seedData.categories.map((c) => c.name);
        const productNames = seedData.products.map((p) => p.name);

        const delProducts = await Product.deleteMany({ name: { $in: productNames } } );
        const delCategories = await Category.deleteMany({ name: { $in: categoryNames } } );

        console.log(`✅ Removed ${delProducts.deletedCount} products, ${delCategories.deletedCount} categories`);
    } catch (err) {
        console.error('❌ Destroy failed:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

const main = async () => {
    const args = process.argv.slice(2);
    if (args.includes('-i')) {
        await importData();
        return;
    }
    if (args.includes('-d')) {
        await destroyData();
        return;
    }
    console.log(`Usage:\n  node ${path.basename(__filename)} -i   import seed data\n  node ${path.basename(__filename)} -d   delete seeded records`);
    process.exit(1);
};

main();
