import { TrendingUp, Home, DollarSign, Users, Calendar, ArrowUpRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardMockup() {
  return (
    <motion.div 
      className="dashboard-mockup"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Main Dashboard Container */}
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-info">
            <h3>Property Overview</h3>
            <p>December 2025</p>
          </div>
          <div className="header-actions">
            <div className="status-badge">
              <span className="status-dot"></span>
              All Systems Active
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <motion.div 
            className="stat-card"
            whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon purple">
              <Home size={20} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Properties</p>
              <h4 className="stat-value">24</h4>
              <span className="stat-change positive">
                <ArrowUpRight size={14} />
                +12% this month
              </span>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon green">
              <DollarSign size={20} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Revenue</p>
              <h4 className="stat-value">KES 2.4M</h4>
              <span className="stat-change positive">
                <ArrowUpRight size={14} />
                +18% this month
              </span>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon blue">
              <Users size={20} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Active Tenants</p>
              <h4 className="stat-value">186</h4>
              <span className="stat-change positive">
                <ArrowUpRight size={14} />
                +8% this month
              </span>
            </div>
          </motion.div>
        </div>

        {/* Chart Section */}
        <div className="chart-section">
          <div className="chart-header">
            <h4>Revenue Trend</h4>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot primary"></span>
                This Year
              </span>
              <span className="legend-item">
                <span className="legend-dot secondary"></span>
                Last Year
              </span>
            </div>
          </div>
          <div className="chart">
            {/* Simple bar chart visualization */}
            <div className="chart-bars">
              {[65, 45, 78, 52, 88, 70, 95, 62, 85, 72, 90, 98].map((height, i) => (
                <motion.div
                  key={i}
                  className="chart-bar"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                >
                  <div className="bar-fill primary"></div>
                  <div className="bar-fill secondary" style={{ height: `${height * 0.7}%` }}></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h4>Recent Activity</h4>
          <div className="activity-list">
            <motion.div 
              className="activity-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="activity-icon success">
                <CheckCircle size={16} />
              </div>
              <div className="activity-content">
                <p className="activity-title">Payment Received</p>
                <p className="activity-meta">Grace K. • Apartment 4B • KES 45,000</p>
              </div>
              <span className="activity-time">2m ago</span>
            </motion.div>

            <motion.div 
              className="activity-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="activity-icon info">
                <Calendar size={16} />
              </div>
              <div className="activity-content">
                <p className="activity-title">New Tenant Onboarded</p>
                <p className="activity-meta">David M. • Westlands Tower • Unit 12A</p>
              </div>
              <span className="activity-time">1h ago</span>
            </motion.div>

            <motion.div 
              className="activity-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="activity-icon success">
                <TrendingUp size={16} />
              </div>
              <div className="activity-content">
                <p className="activity-title">Occupancy Rate Increased</p>
                <p className="activity-meta">Karen Complex • 94% occupancy</p>
              </div>
              <span className="activity-time">3h ago</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating Elements for Depth */}
      <motion.div 
        className="floating-card top-left"
        animate={{ 
          y: [0, -10, 0],
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="mini-card">
          <div className="mini-icon">💰</div>
          <div className="mini-content">
            <p className="mini-label">Quick Pay</p>
            <p className="mini-value">Ready</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="floating-card bottom-right"
        animate={{ 
          y: [0, 10, 0],
        }}
        transition={{ 
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <div className="mini-card">
          <div className="mini-icon">🏠</div>
          <div className="mini-content">
            <p className="mini-label">Vacancy</p>
            <p className="mini-value">6%</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
