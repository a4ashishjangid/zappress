import React, { useState, useEffect } from 'react';
import { Database, Search, ChevronDown } from 'lucide-react';

const VARIABLES = [
  { category: 'Site',                label: 'Site Name',               value: '{{site.name}}' },
  { category: 'Site',                label: 'Site URL',                value: '{{site.url}}' },

  { category: 'Users',               label: 'User Login Name',         value: '{{trigger.user_login}}' },
  { category: 'Users',               label: 'User Email Address',      value: '{{trigger.user_email}}' },
  { category: 'Users',               label: 'Display Name',            value: '{{trigger.display_name}}' },
  { category: 'Users',               label: 'User ID',                 value: '{{trigger.user_id}}' },

  { category: 'Posts',               label: 'Post Title',              value: '{{trigger.post_title}}' },
  { category: 'Posts',               label: 'Post Content',            value: '{{trigger.post_content}}' },
  { category: 'Posts',               label: 'Post Permalink',          value: '{{trigger.post_url}}' },
  { category: 'Posts',               label: 'Post Author Email',       value: '{{trigger.author_email}}' },
  { category: 'Posts',               label: 'Post ID',                 value: '{{trigger.post_id}}' },

  { category: 'WooCommerce Orders',  label: 'Order ID',                value: '{{trigger.order_id}}' },
  { category: 'WooCommerce Orders',  label: 'Order Number',            value: '{{trigger.order_number}}' },
  { category: 'WooCommerce Orders',  label: 'Order Total Amount',      value: '{{trigger.total}}' },
  { category: 'WooCommerce Orders',  label: 'Billing Name',            value: '{{trigger.billing_name}}' },
  { category: 'WooCommerce Orders',  label: 'Billing Email Address',   value: '{{trigger.billing_email}}' },
  { category: 'WooCommerce Orders',  label: 'Order Status',            value: '{{trigger.status}}' },
];

const CATEGORY_COLORS = {
  'Site':                { bg: '#F1F5F9', color: '#475569' },
  'Users':               { bg: '#EFF6FF', color: '#2563EB' },
  'Posts':               { bg: '#F5F3FF', color: '#7C3AED' },
  'WooCommerce Orders':  { bg: '#FEF3C7', color: '#D97706' },
  'API Credentials':     { bg: '#DCFCE7', color: '#16A34A' },
};

/**
 * VariableSelector Component
 * Renders a dropdown menu showing available trigger and connection data variables.
 * Allows users to click variables to inject double-brace placeholders (e.g. {{trigger.post_title}}) into input fields.
 *
 * @param {object} props
 * @param {function} props.onSelect Handler invoked when a variable is clicked
 */
export default function VariableSelector({ onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen]         = useState(false);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const rootUrl = window.zapPressSettings?.root || '/wp-json/';
        const nonce   = window.zapPressSettings?.nonce;
        const res = await fetch(`${rootUrl}zappress/v1/connections`, {
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce }
        });
        if (res.ok) setConnections((await res.json()) || []);
      } catch (err) {
        console.error('VariableSelector connections fetch error:', err);
      }
    };
    fetchConnections();
  }, []);

  const getDynamicVariables = () => {
    const list = [...VARIABLES];
    connections.forEach(conn => {
      const slug = conn.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (conn.auth_type === 'bearer') {
        list.push({ category: 'API Credentials', label: `${conn.name} (Token)`,    value: `{{credentials.${slug}.token}}` });
      } else if (conn.auth_type === 'apikey') {
        list.push({ category: 'API Credentials', label: `${conn.name} (API Key)`,  value: `{{credentials.${slug}.api_key}}` });
      } else if (conn.auth_type === 'basic') {
        list.push({ category: 'API Credentials', label: `${conn.name} (Username)`, value: `{{credentials.${slug}.username}}` });
        list.push({ category: 'API Credentials', label: `${conn.name} (Password)`, value: `{{credentials.${slug}.password}}` });
      } else if (conn.auth_type === 'custom') {
        const headers = conn.credentials?.headers || [];
        if (headers.length === 0) {
          list.push({ category: 'API Credentials', label: `${conn.name} Headers`, value: `{{credentials.${slug}.headers}}` });
        } else {
          headers.forEach(h => {
            if (h.key) {
              const hSlug = h.key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
              list.push({ category: 'API Credentials', label: `${conn.name} (${h.key})`, value: `{{credentials.${slug}.${hSlug}}}` });
            }
          });
        }
      }
    });
    return list;
  };

  const filtered = getDynamicVariables().filter(v =>
    v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {});

  return (
    <div className="relative inline-block text-left">

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 cursor-pointer border rounded-md transition-all"
        style={{
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: '600',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#2563EB',
          borderRadius: '6px',
          lineHeight: '1.4',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; e.currentTarget.style.borderColor = '#93C5FD'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
      >
        <Database className="w-3 h-3 shrink-0" style={{ color: '#2563EB' }} />
        Variables
        <ChevronDown className="w-3 h-3 shrink-0" style={{ opacity: 0.6, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />

          <div
            className="absolute right-0 z-40"
            style={{
              top: 'calc(100% + 6px)',
              width: '280px',
              maxHeight: '320px',
              overflowY: 'auto',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(15,23,42,0.12), 0 4px 8px rgba(15,23,42,0.06)',
              padding: '8px',
            }}
          >
            {/* Search */}
            <div
              className="flex items-center gap-2 mb-2"
              style={{
                padding: '6px 10px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '7px',
              }}
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search variables…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: '#0F172A',
                  padding: '0',
                  boxShadow: 'none',
                }}
              />
            </div>

            {/* Groups */}
            {Object.keys(grouped).length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                No matching variables.
              </p>
            ) : (
              <div className="space-y-1">
                {Object.keys(grouped).map((cat) => {
                  const catStyle = CATEGORY_COLORS[cat] || { bg: '#F1F5F9', color: '#64748B' };
                  return (
                    <div key={cat}>
                      {/* Category Label */}
                      <div
                        className="flex items-center gap-1.5 px-2 pt-2 pb-1"
                      >
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: catStyle.bg, color: catStyle.color }}
                        >
                          {cat}
                        </span>
                      </div>

                      {/* Items */}
                      <div>
                        {grouped[cat].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              onSelect(item.value);
                              setIsOpen(false);
                              setSearchTerm('');
                            }}
                            className="w-full text-left cursor-pointer border-0 rounded-lg transition-colors"
                            style={{
                              padding: '5px 8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'transparent',
                              gap: '8px',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = catStyle.bg;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span
                              className="text-xs font-medium truncate"
                              style={{ color: '#374151' }}
                            >
                              {item.label}
                            </span>
                            <code
                              className="text-[9px] font-mono shrink-0"
                              style={{
                                color: catStyle.color,
                                background: catStyle.bg,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                maxWidth: '110px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {item.value}
                            </code>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
