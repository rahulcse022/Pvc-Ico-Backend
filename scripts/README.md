# Scripts Directory

This directory contains utility scripts for the trading game system.

## Files

### `loadTest.js` - Comprehensive Load Testing & Monitoring Script
**All-in-one load testing, monitoring, and cleanup solution**

**Features:**
- Load testing with configurable concurrent users
- Real-time system monitoring
- Automatic round progression
- Comprehensive performance reporting
- Admin token management
- Test data cleanup
- Database connection management
- Colored console output
- Timer reset functionality

**Usage:**
```bash
# Run load test with monitoring
npm run load-test

# Run monitoring only
npm run monitor

# Run cleanup only
npm run cleanup

# Direct usage
node scripts/loadTest.js                    # Load test
node scripts/loadTest.js --monitor          # Monitoring only
node scripts/loadTest.js -m                 # Monitoring only (short)
node scripts/loadTest.js --cleanup          # Cleanup only
node scripts/loadTest.js -c                 # Cleanup only (short)
node scripts/loadTest.js --cleanup --reset-timer  # Cleanup with timer reset
```

**Configuration:**
Edit the constants at the top of `loadTest.js`:
```javascript
const CONCURRENT_USERS = 10;     // Number of test users
const TEST_DURATION = 120000;    // Test duration (ms)
const BET_INTERVAL = 2000;       // Bet interval per user (ms)
const MONITOR_INTERVAL = 5000;   // Monitoring interval (ms)
```

### Cleanup Functionality
**Integrated into the main loadTest.js script**

**Features:**
- Removes all test users (testuser*@loadtest.com)
- Removes test transactions
- Provides cleanup summary
- Safe to run multiple times
- Optional timer reset functionality
- Database connection management

## Admin Requirements

The load testing system requires an admin user with these credentials:
- **Email**: admin@pvctrading.io
- **Password**: Admin@123
- **Role**: admin

## Test User Pattern

Test users are created with this pattern:
- **Email**: testuser1@loadtest.com, testuser2@loadtest.com, etc.
- **Password**: Test@123
- **Initial Balance**: 10,000 PVC

## Monitoring Features

The monitoring system provides:
- Real-time load metrics
- Performance indicators (🟢 LOW / 🟡 MEDIUM / 🔴 HIGH)
- System recommendations
- Database connection monitoring
- Round progression tracking

## Performance Targets

- **Success Rate**: >95%
- **Response Time**: <1000ms
- **Database Connections**: <90
- **Concurrent Users**: Configurable (default: 10)

## Troubleshooting

1. **Admin token issues**: Verify admin credentials
2. **Database connection**: Check MongoDB status
3. **Round progression**: Verify timer service is running
4. **Test user conflicts**: Run cleanup before testing

## API Endpoints

The load testing system uses several admin-only API endpoints managed by `controller/loadTestController.js`:

- `GET /admin/load-metrics` - Real-time load metrics
- `POST /admin/test/add-balance` - Add balance to test users  
- `GET /admin/system-health` - System health check
- `POST /admin/reset-load-test` - Reset test environment
- `GET /admin/load-test-stats` - Load test statistics

## Related Files

- `controller/loadTestController.js` - Load testing API endpoints
- `utils/loadMonitor.js` - Load monitoring utilities
- `LOAD_TESTING.md` - Complete documentation

For detailed documentation, see `LOAD_TESTING.md` in the project root.
