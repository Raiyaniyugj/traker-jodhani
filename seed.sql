INSERT OR REPLACE INTO settings (id, company_name, owner_name, email, phone, currency, shopify_shop_domain, shopify_webhook_secret, shopify_admin_access_token, shopify_is_connected, shopify_last_sync_at, shopify_auto_sync, updated_at) VALUES ('default', 'VALAM DESIGN', 'Dhiren Bhagvanbhai Savaliya', 'valamdesignindia+0@gmail.com', '+919930022492', '$', 'jodhaniexport.myshopify.com', 'shpss_test_secret_12345', 'shpat_demo_secret_token', 1, '2026-10-14T07:45:13.846Z', 1, datetime('now'));
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-1', 'New Orders', 1, '["Admin"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-2', 'CAD Design', 2, '["Admin","CAD Designer"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-3', 'RPT', 3, '["Admin"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-4', 'Casting', 4, '["Admin","Manufacturer"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-5', 'Factory', 5, '["Admin","Manufacturer"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-6', 'Quality Check', 6, '["Admin","CAD Designer","Manufacturer"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-7', 'Packaging', 7, '["Admin","Manufacturer"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-8', 'Shipping', 8, '["Admin"]');
INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES ('stage-9', 'Completed', 9, '["Admin"]');
INSERT OR REPLACE INTO users (id, name, email, role, password, created_at) VALUES ('user-1', 'Dhiren Bhagvanbhai Savaliya', 'valamdesignindia+0@gmail.com', 'Admin', '', '2026-09-01T10:00:00.000Z');
INSERT OR REPLACE INTO users (id, name, email, role, password, created_at) VALUES ('user-2', 'Amit Patel', 'amit.cad@example.com', 'CAD Designer', '', '2026-09-05T11:00:00.000Z');
INSERT OR REPLACE INTO users (id, name, email, role, password, created_at) VALUES ('user-3', 'Rajesh Sharma', 'rajesh.casting@example.com', 'Manufacturer', '', '2026-09-10T14:30:00.000Z');
INSERT OR REPLACE INTO orders (
      id, order_number, shopify_order_id, shopify_order_number, source, customer_name, customer_email, customer_phone,
      shipping_address, billing_address, items, subtotal, shipping_fee, total, base_production_cost, profit,
      current_stage_id, priority, status, progress_percent, assigned_to, due_date, notes_from_customer, internal_notes,
      tracking_number, tracking_carrier, tracking_url, customer_tracking_token, gallery, comments, activity,
      created_at, updated_at
    ) VALUES (
      'ord-1791889575159-bsgoe', '#4419', '1791889575154', '#4419',
      'shopify', 'Sophia Laurent', 'sophia.laurent@luxurygems.fr', '+33 6 12 34 56 78',
      '{"address1":"402, Royal Diamond Plaza, Mini Bazar","address2":"","city":"Surat","province":"Gujarat","zip":"395006","country":"India"}', '{"address1":"402, Royal Diamond Plaza, Mini Bazar","city":"Surat","province":"Gujarat","zip":"395006","country":"India"}',
      '[{"id":"li-0-1791889575154","title":"Pavé Halo Diamond Pendant","productType":"Pendant","variantTitle":"14K Rose Gold / 1.50ct","sku":"JOD-PENDANT-894","metalType":"14K","metalColor":"Rose gold","diamondShape":"Round","diamondSize":"1.50","chainLength":"—","customEngraving":"Valam Bespoke","quantity":1,"price":1350,"imageUrl":""}]', 1350, 60, 1410,
      635, 715, 'stage-6', 'Medium',
      'Active', 67, NULL, '2026-10-27',
      'Custom Inscription: Valam Bespoke', 'Auto-imported from Shopify store. Ready for CAD design.', NULL, NULL,
      NULL, 'tr_xo7j28d4', '[]',
      '[]', '[{"id":"act-1791962896522","description":"Stage moved to Quality Check","timestamp":"2026-10-14T07:28:16.522Z","actor":"Admin"},{"id":"act-1791962896520","description":"Stage moved to Factory","timestamp":"2026-10-14T07:28:16.520Z","actor":"Admin"},{"id":"act-1791962896519","description":"Stage moved to Casting","timestamp":"2026-10-14T07:28:16.519Z","actor":"Admin"},{"id":"act-1791962896517","description":"Stage moved to RPT","timestamp":"2026-10-14T07:28:16.517Z","actor":"Admin"},{"id":"act-1791962896514","description":"Stage moved to CAD Design","timestamp":"2026-10-14T07:28:16.514Z","actor":"Admin"},{"id":"act-1791889575159","description":"Order created (via Shopify Webhook)","timestamp":"2026-10-13T11:06:15.159Z","actor":"Shopify"}]',
      '2026-10-13T11:06:15.159Z', '2026-10-14T07:28:16.522Z'
    );
INSERT OR REPLACE INTO orders (
      id, order_number, shopify_order_id, shopify_order_number, source, customer_name, customer_email, customer_phone,
      shipping_address, billing_address, items, subtotal, shipping_fee, total, base_production_cost, profit,
      current_stage_id, priority, status, progress_percent, assigned_to, due_date, notes_from_customer, internal_notes,
      tracking_number, tracking_carrier, tracking_url, customer_tracking_token, gallery, comments, activity,
      created_at, updated_at
    ) VALUES (
      'ord-1791888806754-88kpr', '#2156', 'sim-1791888806748', '#2156',
      'shopify', 'Marcus Vance', 'mvance@manhattanfinejewels.com', '+1 212 555 0192',
      '{"address1":"742 Evergreen Luxury Blvd","address2":"","city":"Mumbai","province":"Maharashtra","zip":"400050","country":"India"}', '{"address1":"742 Evergreen Luxury Blvd","city":"Mumbai","province":"Maharashtra","zip":"400050","country":"India"}',
      '[{"id":"li-0-1791888806748","title":"Pavé Halo Diamond Pendant","productType":"Pendant","variantTitle":"14K Rose Gold / 1.50ct","sku":"JOD-PENDANT-770","metalType":"14K","metalColor":"Rose gold","diamondShape":"Round","diamondSize":"1.00","chainLength":"—","customEngraving":"Valam Bespoke","quantity":1,"price":1350,"imageUrl":""}]', 1350, 50, 1400,
      608, 742, 'stage-7', 'Medium',
      'Active', 78, NULL, '2026-10-27',
      'Custom order: Engraving: Valam Bespoke', 'Imported via Shopify integration.', NULL, NULL,
      NULL, 'tr_njww1r44', '[]',
      '[]', '[{"id":"act-1791962921146","description":"Stage moved to Packaging","timestamp":"2026-10-14T07:28:41.146Z","actor":"Admin"},{"id":"act-1791889659340","description":"Stage moved to Quality Check","timestamp":"2026-10-13T11:07:39.341Z","actor":"Admin"},{"id":"act-1791889067862","description":"Stage moved to Factory","timestamp":"2026-10-13T10:57:47.862Z","actor":"Admin"},{"id":"act-1791889067014","description":"Stage moved to Casting","timestamp":"2026-10-13T10:57:47.014Z","actor":"Admin"},{"id":"act-1791889066050","description":"Stage moved to RPT","timestamp":"2026-10-13T10:57:46.050Z","actor":"Admin"},{"id":"act-1791889064274","description":"Stage moved to CAD Design","timestamp":"2026-10-13T10:57:44.274Z","actor":"Admin"},{"id":"act-1791888806754","description":"Order created (via Shopify Webhook)","timestamp":"2026-10-13T10:53:26.754Z","actor":"Shopify"}]',
      '2026-10-13T10:53:26.754Z', '2026-10-14T07:28:41.146Z'
    );
INSERT OR REPLACE INTO orders (
      id, order_number, shopify_order_id, shopify_order_number, source, customer_name, customer_email, customer_phone,
      shipping_address, billing_address, items, subtotal, shipping_fee, total, base_production_cost, profit,
      current_stage_id, priority, status, progress_percent, assigned_to, due_date, notes_from_customer, internal_notes,
      tracking_number, tracking_carrier, tracking_url, customer_tracking_token, gallery, comments, activity,
      created_at, updated_at
    ) VALUES (
      '6a4dc73d-2dc6-4e67-ba26-5769e3e55926', 'VALAM DESIGN', 'gid://shopify/Order/58928371928', '#1001',
      'shopify', 'Dhiren Bhagvanbhai Savaliya', 'valamdesignindia@gmail.com', '+919930022492',
      '{"address1":"402, Royal Diamond Plaza, Mini Bazar","city":"Surat","province":"Gujarat","zip":"395006","country":"India"}', '{"address1":"402, Royal Diamond Plaza, Mini Bazar","city":"Surat","province":"Gujarat","zip":"395006","country":"India"}',
      '[{"id":"item-1","title":"VALAM DESIGN","productType":"Pendant","variantTitle":"14K White Gold / 1.20ct","sku":"VD-PND-001","metalType":"14K","metalColor":"White gold","diamondShape":"Round","diamondSize":"1.20","chainLength":"—","customEngraving":"14K Stamping & engraving Dhiren''","quantity":1,"price":1075,"imageUrl":""}]', 1075, 60, 1135,
      500, 575, 'stage-9', 'High',
      'Delivered', 100, 'Rajesh Sharma', '2026-10-18',
      'No notes from customer.', 'Rush order for upcoming exhibition delivery. Priority laser engraving confirmed.', '', 'FedEx Priority',
      '', 'tr_valam_928174', '[]',
      '[{"id":"c-1","author":"Amit Patel","role":"CAD Designer","text":"CAD file generated and passed 3D inspection. Sent to RPT wax printing.","createdAt":"2026-09-24T14:20:00.000Z"},{"id":"c-2","author":"Rajesh Sharma","role":"Manufacturer","text":"Casting in 14K white gold completed smoothly. Stones set and polished.","createdAt":"2026-10-02T16:45:00.000Z"}]', '[{"id":"act-1791889073617","description":"Stage moved to Completed","timestamp":"2026-10-13T10:57:53.617Z","actor":"Admin"},{"id":"act-1","description":"Order imported from Shopify (#1001)","timestamp":"2026-09-22T08:14:00.000Z","actor":"Shopify Webhook"},{"id":"act-2","description":"Stage moved from New Orders to CAD Design","timestamp":"2026-09-23T09:30:00.000Z","actor":"Dhiren Bhagvanbhai Savaliya"},{"id":"act-3","description":"Stage moved from Factory to Quality Check","timestamp":"2026-10-08T11:00:00.000Z","actor":"Rajesh Sharma"},{"id":"act-4","description":"Stage moved to Shipping","timestamp":"2026-10-12T15:20:00.000Z","actor":"Dhiren Bhagvanbhai Savaliya"}]',
      '2026-09-22T08:14:00.000Z', '2026-10-13T10:57:53.617Z'
    );
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791963913848', 'admin/orders-sync', NULL, 'success', 'Manual sync executed. Synced orders from jodhaniexport.myshopify.com', 'Imported count: 0', '2026-10-14T07:45:13.848Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791889763998', 'admin/orders-sync', NULL, 'success', 'Manual sync executed. Synced orders from jodhaniexport.myshopify.com', 'Imported count: 0', '2026-10-13T11:09:23.998Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791889575161', 'orders/create (simulated)', '1791889575154', 'success', 'Simulated order #4419 successfully ingested.', 'Sophia Laurent - Pavé Halo Diamond Pendant ($1410)', '2026-10-13T11:06:15.161Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791889556160', 'admin/orders-sync', NULL, 'success', 'Manual sync executed. Synced orders from jodhaniexport.myshopify.com', 'Imported count: 0', '2026-10-13T11:05:56.160Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791889214649', 'admin/orders-sync', NULL, 'success', 'Manual sync executed. Synced orders from valamdesign.myshopify.com', 'Imported count: 0', '2026-10-13T11:00:14.649Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791889190238', 'admin/orders-sync', NULL, 'success', 'Manual sync executed. Synced orders from valamdesign.myshopify.com', 'Imported count: 0', '2026-10-13T10:59:50.238Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1791888806755', 'orders/create (simulated)', 'sim-1791888806748', 'success', 'Simulated order #2156 successfully ingested.', 'Marcus Vance - Pavé Halo Diamond Pendant ($1400)', '2026-10-13T10:53:26.755Z');
INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES ('wh-1', 'orders/create', '58928371928', 'success', 'Order #1001 imported into New Orders successfully', 'VALAM DESIGN - 14K Pendant ($1,135)', '2026-09-22T08:14:00.000Z');