const path = require('path');
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Load env vars from .env.local if present (falls back to process env)
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const DB_NAME = process.env.DB_NAME || 'chef';
const MONGO_CLUSTER = process.env.MONGO_CLUSTER || 'cluster0.fab0szf.mongodb.net';

// Prefer a fully composed URI; otherwise build from user/pass for the specified cluster
const MONGODB_URI =
	process.env.MONGODB_URI ||
	`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${MONGO_CLUSTER}/?appName=Cluster0`;

if (!MONGODB_URI) {
	console.warn('[warning] MONGODB_URI is not set. Set DB_USER/DB_PASS or MONGODB_URI before starting the server.');
}

const app = express();

// Allow comma-separated origins or single string; default to common local ports
const allowedOrigins = (CLIENT_URL || '')
	.split(',')
	.map((o) => o.trim())
	.filter(Boolean);
if (allowedOrigins.length === 0) {
	allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
}

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	})
);
app.use(express.json());

const client = new MongoClient(MONGODB_URI, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

const getItemsCollection = () => client.db(DB_NAME).collection('items');
const getUsersCollection = () => client.db(DB_NAME).collection('users');

// Health check
app.get('/api/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== USER ENDPOINTS =====
// Create/Register user
app.post('/api/users', async (req, res, next) => {
	try {
		const { email, name, role } = req.body || {};

		if (!email || !name) {
			return res.status(400).json({ error: 'email and name are required' });
		}

		// Check if user already exists
		const existingUser = await getUsersCollection().findOne({ email });
		if (existingUser) {
			return res.status(409).json({ error: 'User already exists' });
		}

		const user = {
			email,
			name,
			role: role || 'staff',
			createdAt: new Date(),
		};

		const result = await getUsersCollection().insertOne(user);
		res.status(201).json({ _id: result.insertedId, ...user });
	} catch (err) {
		next(err);
	}
});

// Get all users
app.get('/api/users', async (_req, res, next) => {
	try {
		const users = await getUsersCollection()
			.find({})
			.sort({ createdAt: -1 })
			.toArray();
		res.json(users);
	} catch (err) {
		next(err);
	}
});

// Get user by id
app.get('/api/users/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid user id' });
		}

		const user = await getUsersCollection().findOne({ _id: new ObjectId(id) });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json(user);
	} catch (err) {
		next(err);
	}
});

// Delete user by id
app.delete('/api/users/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid user id' });
		}

		const result = await getUsersCollection().deleteOne({ _id: new ObjectId(id) });
		if (result.deletedCount === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json({ message: 'User deleted successfully', deletedId: id });
	} catch (err) {
		next(err);
	}
});

// List items
app.get('/api/items', async (_req, res, next) => {
	try {
		const items = await getItemsCollection()
			.find({})
			.sort({ createdAt: -1 })
			.limit(100)
			.toArray();
		res.json(items);
	} catch (err) {
		next(err);
	}
});

// Single item by id
app.get('/api/items/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid item id' });
		}

		const item = await getItemsCollection().findOne({ _id: new ObjectId(id) });
		if (!item) {
			return res.status(404).json({ error: 'Item not found' });
		}

		res.json(item);
	} catch (err) {
		next(err);
	}
});

// Delete item by id
app.delete('/api/items/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid item id' });
		}

		const result = await getItemsCollection().deleteOne({ _id: new ObjectId(id) });
		if (result.deletedCount === 0) {
			return res.status(404).json({ error: 'Item not found' });
		}

		res.json({ message: 'Item deleted successfully', deletedId: id });
	} catch (err) {
		next(err);
	}
});

// Create item (minimal validation; add auth upstream if needed)
app.post('/api/items', async (req, res, next) => {
	try {
		const { name, description, price, category, image, badge, badgeColor, isLarge, tags } = req.body || {};

		if (!name || !description || typeof price !== 'number') {
			return res.status(400).json({ error: 'name, description, and numeric price are required' });
		}

		const doc = {
			name,
			description,
			price,
			category: category || 'Uncategorized',
			image: image || '',
			badge: badge || null,
			badgeColor: badgeColor || null,
			isLarge: Boolean(isLarge),
			tags: Array.isArray(tags) ? tags : [],
			createdAt: new Date(),
		};

		const result = await getItemsCollection().insertOne(doc);
		res.status(201).json({ _id: result.insertedId, ...doc });
	} catch (err) {
		next(err);
	}
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
	console.error(err);
	res.status(500).json({ error: 'Internal server error' });
});

async function start() {
	try {
		await client.connect();
		await client.db('admin').command({ ping: 1 });
		console.log('Connected to MongoDB and pinged admin database.');

		app.listen(PORT, () => {
			console.log(`API server listening on port ${PORT}`);
		});
	} catch (err) {
		console.error('Failed to start server', err);
		process.exit(1);
	}
}

start();
