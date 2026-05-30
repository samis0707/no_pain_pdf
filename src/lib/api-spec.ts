export const apiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'No Pain PDF API',
    version: '0.1.0',
    description: 'Agentic print PDF generator — REST API',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/projects': {
      get: {
        summary: 'List all projects',
        responses: { '200': { description: 'Array of projects', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PrintProject' } } } } } },
      },
      post: {
        summary: 'Create a project',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
        responses: { '201': { description: 'Created project', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrintProject' } } } }, '400': { description: 'Missing name' } },
      },
    },
    '/projects/{id}': {
      get: {
        summary: 'Get a project by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Project', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrintProject' } } } }, '404': { description: 'Not found' } },
      },
      put: {
        summary: 'Update a project',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, status: { type: 'string' } } } } } },
        responses: { '200': { description: 'Updated project' }, '400': { description: 'No fields' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Delete a project',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/items': {
      post: {
        summary: 'Create a print item',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['projectId', 'name'], properties: { projectId: { type: 'integer' }, name: { type: 'string' } } } } } },
        responses: { '201': { description: 'Created item', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrintItem' } } } }, '400': { description: 'Missing fields' }, '404': { description: 'Project not found' } },
      },
    },
    '/items/{id}': {
      get: {
        summary: 'Get a print item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Print item', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrintItem' } } } }, '404': { description: 'Not found' } },
      },
      put: {
        summary: 'Update print item HTML/CSS',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { html: { type: 'string' }, css: { type: 'string' }, name: { type: 'string' } } } } } },
        responses: { '200': { description: 'Updated item' }, '400': { description: 'Invalid JSON' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Delete a print item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/items/{id}/datasets': {
      get: {
        summary: 'List datasets for an item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Array of datasets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DataSet' } } } } } },
      },
      post: {
        summary: 'Upload CSV as a dataset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { '201': { description: 'Created dataset', content: { 'application/json': { schema: { $ref: '#/components/schemas/DataSet' } } } }, '400': { description: 'Missing file' }, '404': { description: 'Item not found' } },
      },
    },
    '/items/{id}/datasets/{dsId}': {
      get: {
        summary: 'Get a dataset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'dsId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Dataset' }, '404': { description: 'Not found' } },
      },
      put: {
        summary: 'Update a dataset (mapping, etc.)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'dsId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, mapping: { type: 'string' } } } } } },
        responses: { '200': { description: 'Updated dataset' }, '400': { description: 'No fields' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Delete a dataset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'dsId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/templates/compile': {
      post: {
        summary: 'Compile a Handlebars template',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, css: { type: 'string' }, data: { type: 'object' } } } } } },
        responses: { '200': { description: 'Compiled HTML document' }, '400': { description: 'Compilation error' } },
      },
    },
    '/templates/validate': {
      post: {
        summary: 'Validate Handlebars syntax',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' } } } } } },
        responses: { '200': { description: 'Validation result' }, '400': { description: 'Missing html' } },
      },
    },
    '/templates/helpers': {
      get: {
        summary: 'List available Handlebars helpers',
        responses: { '200': { description: 'Helpers list' } },
      },
    },
    '/assets/upload': {
      post: {
        summary: 'Upload an asset file',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { '201': { description: 'Uploaded asset' }, '400': { description: 'Missing file' } },
      },
    },
    '/assets/file/{filename}': {
      get: {
        summary: 'Serve an uploaded asset file',
        parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'File binary' }, '404': { description: 'Not found' } },
      },
    },
    '/pdf/generate': {
      post: {
        summary: 'Generate PDF from HTML/CSS',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, css: { type: 'string' }, options: { type: 'object', properties: { format: { type: 'string', enum: ['A4', 'Letter'] }, orientation: { type: 'string', enum: ['portrait', 'landscape'] }, margin: { type: 'string', enum: ['normal', 'narrow', 'wide'] } } } } } } } },
        responses: { '200': { description: 'PDF binary' }, '400': { description: 'Missing html' }, '500': { description: 'Generation failed' } },
      },
    },
  },
  components: {
    schemas: {
      PrintProject: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          name: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PrintItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          projectId: { type: 'integer' },
          name: { type: 'string' },
          html: { type: 'string' },
          css: { type: 'string' },
          version: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DataSet: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          printItemId: { type: 'integer' },
          name: { type: 'string' },
          columns: { type: 'string' },
          rows: { type: 'string' },
          rowCount: { type: 'integer' },
          mapping: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}
