const database = require('../config/database');

/**
 * Database utility functions for the entire project
 * This file provides common database operations and utilities
 */

class DatabaseUtils {
    /**
     * Ensure database connection before performing operations
     */
    static async ensureConnection() {
        if (!database.isConnectionActive()) {
            await database.connect();
        }
        return database.getConnection();
    }

    /**
     * Get database status
     */
    static getStatus() {
        return database.getConnectionStatus();
    }

    /**
     * Check if database is connected
     */
    static isConnected() {
        return database.isConnectionActive();
    }

    /**
     * Get mongoose instance
     */
    static getMongoose() {
        return database.getMongoose();
    }

    /**
     * Get database instance
     */
    static getDatabase() {
        return database.getDatabase();
    }

    /**
     * Execute a database operation with automatic connection handling
     */
    static async executeWithConnection(operation) {
        try {
            await this.ensureConnection();
            return await operation();
        } catch (error) {
            console.error('Database operation failed:', error);
            throw error;
        }
    }

    /**
     * Safe database query with error handling
     */
    static async safeQuery(queryFunction, errorMessage = 'Database query failed') {
        try {
            await this.ensureConnection();
            return await queryFunction();
        } catch (error) {
            console.error(`${errorMessage}:`, error);
            throw new Error(`${errorMessage}: ${error.message}`);
        }
    }

    /**
     * Transaction wrapper
     */
    static async withTransaction(operation) {
        const session = await this.getMongoose().startSession();
        try {
            await session.startTransaction();
            const result = await operation(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    /**
     * Health check for database
     */
    static async healthCheck() {
        try {
            const status = this.getStatus();
            const isHealthy = this.isConnected();

            return {
                healthy: isHealthy,
                status: status.status,
                readyState: status.readyState,
                host: status.host,
                port: status.port,
                name: status.name,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Graceful shutdown
     */
    static async shutdown() {
        try {
            await database.disconnect();
            console.log('✅ Database utilities shutdown completed');
        } catch (error) {
            console.error('❌ Error during database utilities shutdown:', error);
            throw error;
        }
    }
}

module.exports = DatabaseUtils;
