const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const collectionPath = path.join(
  root,
  'postman',
  'collections',
  'CropWise.postman_collection.json',
);
const environmentTemplatePath = path.join(
  root,
  'postman',
  'environments',
  'CropWise Local.postman_environment.example.json',
);
const localEnvironmentPath = path.join(
  root,
  'postman',
  'environments',
  'CropWise Local.postman_environment.json',
);

const bearer = (token) => ({
  type: 'bearer',
  bearer: [{ key: 'token', value: `{{${token}}}`, type: 'string' }],
});

const req = (name, method, endpoint, expected, options = {}) => {
  const item = {
    name,
    request: {
      method,
      header: options.body
        ? [{ key: 'Content-Type', value: 'application/json' }]
        : [],
      url: `{{baseUrl}}${endpoint}`,
      description: `Expected HTTP ${expected}.`,
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            `pm.test('Returns HTTP ${expected}', () => pm.response.to.have.status(${expected}));`,
            ...(options.noPassword
              ? [
                  "pm.test('Does not expose password', () => pm.expect(pm.response.text()).not.to.include('password'));",
                ]
              : []),
            ...(options.saveToken
              ? [
                  `const token = pm.response.json().accessToken;`,
                  `pm.environment.set('${options.saveToken}', token);`,
                  `pm.environment.set('accessToken', token);`,
                ]
              : []),
            ...(options.saveId
              ? [
                  `pm.environment.set('${options.saveId}', pm.response.json()['${options.idField}']);`,
                ]
              : []),
            ...(options.assertDate
              ? [
                  `pm.test('Formats ${options.assertDate.field} as expected', () => pm.expect(pm.response.json()['${options.assertDate.field}']).to.eql('${options.assertDate.value}'));`,
                ]
              : []),
          ],
        },
      },
    ],
  };
  if (options.generateEmail) {
    item.event.unshift({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          `pm.environment.set('${options.generateEmail}', 'postman-${options.generateEmail}-' + pm.variables.replaceIn('{{$guid}}') + '@example.com');`,
        ],
      },
    });
  }
  if (options.auth === false) item.request.auth = { type: 'noauth' };
  if (options.auth === true) {
    item.request.auth = bearer(options.token ?? 'accessToken');
  }
  if (options.body !== undefined) {
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(options.body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  return item;
};

const folder = (name, token, items) => ({
  name,
  ...(token ? { auth: bearer(token) } : {}),
  item: items,
});

const collection = {
  info: {
    name: 'CropWise API',
    description:
      'Postman tests for the implemented CropWise API. Use MM/DD/YYYY for date fields and MM/DD/YYYY HH:mm:ss for transactionDate. Select the CropWise Local environment and add local test credentials there before sending login requests. Do not export or commit an environment containing real credentials or JWTs.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearer('accessToken'),
  item: [
    folder('Auth', null, [
      req('Register user', 'POST', '/auth/register', 201, {
        auth: false,
        body: {
          fullName: 'Postman User',
          email: '{{userEmail}}',
          password: '{{userPassword}}',
        },
        generateEmail: 'userEmail',
        noPassword: true,
      }),
      req('Login user', 'POST', '/auth/login', 200, {
        auth: false,
        body: { email: '{{userEmail}}', password: '{{userPassword}}' },
        saveToken: 'userToken',
      }),
      req('Login admin', 'POST', '/auth/login', 200, {
        auth: false,
        body: { email: '{{adminEmail}}', password: '{{adminPassword}}' },
        saveToken: 'adminToken',
      }),
      req('Get profile', 'GET', '/auth/profile', 200, {
        auth: true,
        token: 'userToken',
      }),
      req('Reject invalid login', 'POST', '/auth/login', 401, {
        auth: false,
        body: { email: '{{userEmail}}', password: 'incorrect-password' },
      }),
      req('Reject duplicate registration', 'POST', '/auth/register', 409, {
        auth: false,
        body: {
          fullName: 'Postman User',
          email: '{{userEmail}}',
          password: '{{userPassword}}',
        },
      }),
    ]),
    folder('Ownership setup', null, [
      req('Register second user', 'POST', '/auth/register', 201, {
        auth: false,
        body: {
          fullName: 'Postman Other User',
          email: '{{otherUserEmail}}',
          password: '{{otherUserPassword}}',
        },
        generateEmail: 'otherUserEmail',
        noPassword: true,
      }),
      req('Login second user', 'POST', '/auth/login', 200, {
        auth: false,
        body: {
          email: '{{otherUserEmail}}',
          password: '{{otherUserPassword}}',
        },
        saveToken: 'otherUserToken',
      }),
      req('Create crop for second user', 'POST', '/crops', 201, {
        auth: true,
        token: 'otherUserToken',
        body: {
          cropName: 'Other User Crop',
          cropType: 'Grain',
          plantingDate: '05/02/2026',
        },
        saveId: 'otherUserCropId',
        idField: 'cropId',
      }),
    ]),
    folder('Users', 'adminToken', [
      req('Create user', 'POST', '/users', 201, {
        body: {
          fullName: 'Postman Managed User',
          email: '{{managedUserEmail}}',
          password: '{{userPassword}}',
          role: 'Farmer',
        },
        generateEmail: 'managedUserEmail',
        saveId: 'managedUserId',
        idField: 'userId',
        noPassword: true,
      }),
      req('List users', 'GET', '/users', 200),
      req('Get user', 'GET', '/users/{{managedUserId}}', 200),
      req('Update user', 'PATCH', '/users/{{managedUserId}}', 200, {
        body: { fullName: 'Updated Postman User' },
      }),
      req('Delete user', 'DELETE', '/users/{{managedUserId}}', 200),
    ]),
    folder('Crops', 'userToken', [
      req('Create crop', 'POST', '/crops', 201, {
        body: {
          cropName: 'Postman Rice',
          cropType: 'Grain',
          plantingDate: '05/01/2026',
          expectedHarvestDate: '09/01/2026',
        },
        saveId: 'cropId',
        idField: 'cropId',
        assertDate: { field: 'plantingDate', value: '05/01/2026' },
      }),
      req('List crops', 'GET', '/crops', 200),
      req('Get crop', 'GET', '/crops/{{cropId}}', 200),
      req('Update crop', 'PATCH', '/crops/{{cropId}}', 200, {
        body: { expectedHarvestDate: '09/15/2026' },
      }),
      req('Reject invalid calendar date', 'POST', '/crops', 400, {
        body: {
          cropName: 'Invalid Date Crop',
          cropType: 'Grain',
          plantingDate: '02/30/2026',
        },
      }),
    ]),
    folder('Farm Activities', 'userToken', [
      req('Create activity', 'POST', '/farm-activities', 201, {
        body: {
          cropId: '{{cropId}}',
          activityName: 'Watering',
          activityDate: '05/03/2026',
        },
        saveId: 'activityId',
        idField: 'activityId',
        assertDate: { field: 'activityDate', value: '05/03/2026' },
      }),
      req('List activities', 'GET', '/farm-activities', 200),
      req('Get activity', 'GET', '/farm-activities/{{activityId}}', 200),
      req('Update activity', 'PATCH', '/farm-activities/{{activityId}}', 200, {
        body: { activityDate: '05/04/2026', notes: 'Postman update' },
      }),
      req('Delete activity', 'DELETE', '/farm-activities/{{activityId}}', 200),
    ]),
    folder('Harvests', 'userToken', [
      req('Create harvest', 'POST', '/harvests', 201, {
        body: {
          cropId: '{{cropId}}',
          harvestDate: '09/01/2026',
          quantityHarvested: 10,
          unit: 'kg',
        },
        saveId: 'harvestId',
        idField: 'harvestId',
        assertDate: { field: 'harvestDate', value: '09/01/2026' },
      }),
      req('List harvests', 'GET', '/harvests', 200),
      req('Get harvest', 'GET', '/harvests/{{harvestId}}', 200),
      req('Update harvest', 'PATCH', '/harvests/{{harvestId}}', 200, {
        body: { harvestDate: '09/02/2026', quantityHarvested: 11 },
      }),
      req('Delete harvest', 'DELETE', '/harvests/{{harvestId}}', 200),
    ]),
    folder('Inventory', 'userToken', [
      req('Create inventory item (Admin)', 'POST', '/inventory', 201, {
        auth: true,
        token: 'adminToken',
        body: {
          itemName: 'Postman Seeds',
          itemType: 'Supply',
          unit: 'kg',
          reorderLevel: 2,
        },
        saveId: 'inventoryId',
        idField: 'inventoryId',
      }),
      req('List inventory', 'GET', '/inventory', 200),
      req('List low stock', 'GET', '/inventory/low-stock', 200),
      req('Get inventory item', 'GET', '/inventory/{{inventoryId}}', 200),
      req('Update inventory item (Admin)', 'PATCH', '/inventory/{{inventoryId}}', 200, {
        auth: true,
        token: 'adminToken',
        body: { reorderLevel: 3 },
      }),
    ]),
    folder('Inventory Transactions', 'userToken', [
      req('Create IN transaction', 'POST', '/inventory-transactions', 201, {
        body: {
          inventoryId: '{{inventoryId}}',
          transactionType: 'IN',
          quantity: 10,
          transactionDate: '09/01/2026 09:30:00',
        },
        saveId: 'transactionId',
        idField: 'transactionId',
        assertDate: {
          field: 'transactionDate',
          value: '09/01/2026 09:30:00',
        },
      }),
      req('List transactions', 'GET', '/inventory-transactions', 200),
      req('Get transaction', 'GET', '/inventory-transactions/{{transactionId}}', 200),
      req('Create zero transaction', 'POST', '/inventory-transactions', 201, {
        body: {
          inventoryId: '{{inventoryId}}',
          transactionType: 'IN',
          quantity: 0,
        },
        saveId: 'zeroTransactionId',
        idField: 'transactionId',
      }),
      req('Reject old transaction date format', 'POST', '/inventory-transactions', 400, {
        body: {
          inventoryId: '{{inventoryId}}',
          transactionType: 'IN',
          quantity: 1,
          transactionDate: '2026-09-01T09:30:00.000Z',
        },
      }),
      req('Reject insufficient stock', 'POST', '/inventory-transactions', 409, {
        body: {
          inventoryId: '{{inventoryId}}',
          transactionType: 'OUT',
          quantity: 999999,
        },
      }),
      req('Update transaction (Admin)', 'PATCH', '/inventory-transactions/{{transactionId}}', 200, {
        auth: true,
        token: 'adminToken',
        body: { transactionDate: '09/01/2026 10:15:00' },
      }),
      req('Delete transaction (Admin)', 'DELETE', '/inventory-transactions/{{transactionId}}', 200, {
        auth: true,
        token: 'adminToken',
      }),
    ]),
    folder('Authorization checks', null, [
      req('Reject missing token', 'GET', '/crops', 401, { auth: false }),
      req('Reject Farmer on Admin route', 'GET', '/users', 403, {
        auth: true,
        token: 'userToken',
      }),
      req('Reject Farmer inventory write', 'POST', '/inventory', 403, {
        auth: true,
        token: 'userToken',
        body: { itemName: 'Forbidden', itemType: 'Supply', unit: 'kg' },
      }),
      req('Reject ISO date input', 'POST', '/crops', 400, {
        auth: true,
        token: 'userToken',
        body: {
          cropName: 'Old Format',
          cropType: 'Grain',
          plantingDate: '2026-05-01',
        },
      }),
      req('Hide another user crop', 'GET', '/crops/{{otherUserCropId}}', 404, {
        auth: true,
        token: 'userToken',
      }),
    ]),
    folder('Cleanup', null, [
      req('Delete zero transaction (Admin)', 'DELETE', '/inventory-transactions/{{zeroTransactionId}}', 200, {
        auth: true,
        token: 'adminToken',
      }),
      req('Delete inventory item (Admin)', 'DELETE', '/inventory/{{inventoryId}}', 200, {
        auth: true,
        token: 'adminToken',
      }),
      req('Delete own crop', 'DELETE', '/crops/{{cropId}}', 200, {
        auth: true,
        token: 'userToken',
      }),
      req('Delete second user crop', 'DELETE', '/crops/{{otherUserCropId}}', 200, {
        auth: true,
        token: 'otherUserToken',
      }),
    ]),
  ],
};

const environment = {
  id: 'cropwise-local-environment',
  name: 'CropWise Local',
  values: [
    ['baseUrl', 'http://localhost:3000/api/v1'],
    ['adminEmail', ''],
    ['adminPassword', ''],
    ['userEmail', ''],
    ['userPassword', ''],
    ['otherUserEmail', ''],
    ['otherUserPassword', ''],
    ['managedUserEmail', ''],
    ['accessToken', ''],
    ['adminToken', ''],
    ['userToken', ''],
    ['otherUserToken', ''],
    ['managedUserId', ''],
    ['cropId', ''],
    ['otherUserCropId', ''],
    ['activityId', ''],
    ['harvestId', ''],
    ['inventoryId', ''],
    ['transactionId', ''],
    ['zeroTransactionId', ''],
  ].map(([key, value]) => ({ key, value, type: 'default', enabled: true })),
  _postman_variable_scope: 'environment',
  _postman_exported_using: 'CropWise backend project',
};

const requests = [];
const collectRequests = (items) =>
  items.forEach((item) =>
    item.item ? collectRequests(item.item) : requests.push(item.request),
  );
collectRequests(collection.item);
const implementedRoutes = new Set(
  requests.map((request) =>
    `${request.method} ${request.url
      .replace('{{baseUrl}}', '')
      .replace(/\{\{[^}]+\}\}/g, ':id')}`,
  ),
);
if (implementedRoutes.size !== 34) {
  throw new Error(`Expected 34 implemented endpoint routes; found ${implementedRoutes.size}.`);
}

fs.mkdirSync(path.dirname(collectionPath), { recursive: true });
fs.mkdirSync(path.dirname(environmentTemplatePath), { recursive: true });
fs.writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
fs.writeFileSync(
  environmentTemplatePath,
  `${JSON.stringify(environment, null, 2)}\n`,
);
if (!fs.existsSync(localEnvironmentPath)) {
  fs.writeFileSync(localEnvironmentPath, `${JSON.stringify(environment, null, 2)}\n`);
}
console.log(`Wrote ${collectionPath}`);
console.log(`Wrote blank template ${environmentTemplatePath}`);
console.log(`Preserved local environment if present: ${localEnvironmentPath}`);
console.log(`Validated ${implementedRoutes.size} unique implemented endpoint routes.`);
