import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- Mock Post model ---
const MockPost = {
  create: mock.fn(),
  findAndCountAll: mock.fn(),
  findByPk: mock.fn(),
  findAll: mock.fn(),
  count: mock.fn(),
};

const mockIsValidUUID = mock.fn();

// Mock dependencies BEFORE dynamically importing the module under test.
// Paths are resolved as absolute URLs from this file's location.
mock.module(new URL('../models/post.model.js', import.meta.url).href, {
  namedExports: { Post: MockPost },
});

mock.module(new URL('../utils/validate.js', import.meta.url).href, {
  namedExports: { isValidUUID: mockIsValidUUID },
});

// Dynamically import controller AFTER mocks are registered
const {
  newPost,
  getPosts,
  getPostById,
  updatePostById,
  deletePostById,
  getPostCount,
  getRecentlyCreatedPosts,
  searchPosts,
} = await import('../controllers/post.controller.js');

// --- Helpers ---
function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
}

beforeEach(() => {
  for (const fn of Object.values(MockPost)) fn.mock.resetCalls();
  mockIsValidUUID.mock.resetCalls();
});

// ─────────────────────────────────────────────
// newPost
// ─────────────────────────────────────────────
describe('newPost', () => {
  it('creates a post and returns 201', async () => {
    const created = {
      id: 'abc',
      title: 'Hello',
      author: 'Greg',
      body: 'Content',
      category: 'tech',
      favorite: false,
    };
    MockPost.create.mock.mockImplementation(async () => created);

    const req = {
      body: {
        title: 'Hello',
        author: 'Greg',
        body: 'Content',
        category: 'tech',
        favorite: false,
        publishedDate: '2024-01-01',
      },
    };
    const res = makeRes();

    await newPost(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, created);
    assert.equal(MockPost.create.mock.callCount(), 1);
  });

  it('returns 400 when Post.create throws', async () => {
    MockPost.create.mock.mockImplementation(async () => {
      throw new Error('Validation error');
    });

    const req = { body: {} };
    const res = makeRes();

    await newPost(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Validation error');
  });
});

// ─────────────────────────────────────────────
// getPosts
// ─────────────────────────────────────────────
describe('getPosts', () => {
  it('returns paginated posts with 200', async () => {
    const posts = [{ id: '1' }, { id: '2' }];
    MockPost.findAndCountAll.mock.mockImplementation(async () => ({
      count: 2,
      rows: posts,
    }));

    const req = { query: { page: '1', limit: '2' } };
    const res = makeRes();

    await getPosts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, posts);
    assert.deepEqual(res.body.pagination, {
      total: 2,
      page: 1,
      limit: 2,
      totalPages: 1,
    });
  });

  it('uses default page=1 and limit=10 when query params are absent', async () => {
    MockPost.findAndCountAll.mock.mockImplementation(async () => ({
      count: 0,
      rows: [],
    }));

    const req = { query: {} };
    const res = makeRes();

    await getPosts(req, res);

    const [call] = MockPost.findAndCountAll.mock.calls;
    assert.equal(call.arguments[0].limit, 10);
    assert.equal(call.arguments[0].offset, 0);
    assert.equal(res.body.pagination.page, 1);
  });

  it('returns "No posts found" message when result is empty', async () => {
    MockPost.findAndCountAll.mock.mockImplementation(async () => ({
      count: 0,
      rows: [],
    }));

    const req = { query: {} };
    const res = makeRes();

    await getPosts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'No posts found.');
  });

  it('returns 500 when findAndCountAll throws', async () => {
    MockPost.findAndCountAll.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = { query: {} };
    const res = makeRes();

    await getPosts(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

// ─────────────────────────────────────────────
// getPostById
// ─────────────────────────────────────────────
describe('getPostById', () => {
  const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('returns 400 for an invalid UUID', async () => {
    mockIsValidUUID.mock.mockImplementation(() => false);

    const req = { params: { id: 'not-a-uuid' } };
    const res = makeRes();

    await getPostById(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid post ID format.');
    assert.equal(MockPost.findByPk.mock.callCount(), 0);
  });

  it('returns 404 when post is not found', async () => {
    mockIsValidUUID.mock.mockImplementation(() => true);
    MockPost.findByPk.mock.mockImplementation(async () => null);

    const req = { params: { id: VALID_UUID } };
    const res = makeRes();

    await getPostById(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'No post with that ID was found.');
  });

  it('returns the post with 200 when found', async () => {
    const post = { id: VALID_UUID, title: 'Test Post' };
    mockIsValidUUID.mock.mockImplementation(() => true);
    MockPost.findByPk.mock.mockImplementation(async () => post);

    const req = { params: { id: VALID_UUID } };
    const res = makeRes();

    await getPostById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, post);
  });

  it('returns 500 when findByPk throws', async () => {
    mockIsValidUUID.mock.mockImplementation(() => true);
    MockPost.findByPk.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = { params: { id: VALID_UUID } };
    const res = makeRes();

    await getPostById(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

// ─────────────────────────────────────────────
// updatePostById
// ─────────────────────────────────────────────
describe('updatePostById', () => {
  it('returns 404 when post is not found', async () => {
    MockPost.findByPk.mock.mockImplementation(async () => null);

    const req = { params: { id: '1' }, body: {} };
    const res = makeRes();

    await updatePostById(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'No post with that ID was found.');
  });

  it('updates the post and returns 200', async () => {
    const updated = { id: '1', title: 'Updated Title' };
    const mockUpdate = mock.fn(async () => updated);
    MockPost.findByPk.mock.mockImplementation(async () => ({
      update: mockUpdate,
    }));

    const req = {
      params: { id: '1' },
      body: {
        title: 'Updated Title',
        author: 'Greg',
        body: 'New content',
        category: 'tech',
        favorite: true,
      },
    };
    const res = makeRes();

    await updatePostById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, updated);
    assert.equal(mockUpdate.mock.callCount(), 1);
  });

  it('converts publishedDate string to a Date object', async () => {
    const mockUpdate = mock.fn(async (fields) => fields);
    MockPost.findByPk.mock.mockImplementation(async () => ({
      update: mockUpdate,
    }));

    const req = {
      params: { id: '1' },
      body: { publishedDate: '2024-06-01' },
    };
    const res = makeRes();

    await updatePostById(req, res);

    const passedFields = mockUpdate.mock.calls[0].arguments[0];
    assert.ok(passedFields.publishedDate instanceof Date);
  });

  it('returns 500 on database error', async () => {
    MockPost.findByPk.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = { params: { id: '1' }, body: {} };
    const res = makeRes();

    await updatePostById(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

// ─────────────────────────────────────────────
// deletePostById
// ─────────────────────────────────────────────
describe('deletePostById', () => {
  it('returns 404 when post is not found', async () => {
    MockPost.findByPk.mock.mockImplementation(async () => null);

    const req = { params: { id: '1' } };
    const res = makeRes();

    await deletePostById(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
  });

  it('destroys the post and returns 200', async () => {
    const mockDestroy = mock.fn(async () => {});
    MockPost.findByPk.mock.mockImplementation(async () => ({
      destroy: mockDestroy,
    }));

    const req = { params: { id: '1' } };
    const res = makeRes();

    await deletePostById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Post deleted successfully.');
    assert.equal(mockDestroy.mock.callCount(), 1);
  });

  it('returns 500 on database error', async () => {
    MockPost.findByPk.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = { params: { id: '1' } };
    const res = makeRes();

    await deletePostById(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

// ─────────────────────────────────────────────
// getPostCount
// ─────────────────────────────────────────────
describe('getPostCount', () => {
  it('returns post count with 200', async () => {
    MockPost.count.mock.mockImplementation(async () => 42);

    const req = {};
    const res = makeRes();

    await getPostCount(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data, 42);
  });

  it('returns 500 on database error', async () => {
    MockPost.count.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = {};
    const res = makeRes();

    await getPostCount(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

// ─────────────────────────────────────────────
// getRecentlyCreatedPosts
// ─────────────────────────────────────────────
describe('getRecentlyCreatedPosts', () => {
  it('returns up to 5 recent posts with 200', async () => {
    const posts = [{ id: '1' }, { id: '2' }, { id: '3' }];
    MockPost.findAll.mock.mockImplementation(async () => posts);

    const req = {};
    const res = makeRes();

    await getRecentlyCreatedPosts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, posts);
  });

  it('returns 404 when no recent posts exist', async () => {
    MockPost.findAll.mock.mockImplementation(async () => []);

    const req = {};
    const res = makeRes();

    await getRecentlyCreatedPosts(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'No recent posts found.');
  });

  it('returns 500 on database error', async () => {
    MockPost.findAll.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = {};
    const res = makeRes();

    await getRecentlyCreatedPosts(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

// ─────────────────────────────────────────────
// searchPosts
// ─────────────────────────────────────────────
describe('searchPosts', () => {
  it('returns 400 when query param is missing', async () => {
    const req = { query: {} };
    const res = makeRes();

    await searchPosts(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(
      res.body.message,
      'Query parameter is required for searching posts.',
    );
    assert.equal(MockPost.findAll.mock.callCount(), 0);
  });

  it('returns 404 when no posts match the search query', async () => {
    MockPost.findAll.mock.mockImplementation(async () => []);

    const req = { query: { query: 'nonexistent' } };
    const res = makeRes();

    await searchPosts(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(
      res.body.message,
      'No posts found matching your search query.',
    );
  });

  it('returns matching posts with 200', async () => {
    const posts = [{ id: '1', title: 'TypeScript tips', category: 'tech' }];
    MockPost.findAll.mock.mockImplementation(async () => posts);

    const req = { query: { query: 'TypeScript' } };
    const res = makeRes();

    await searchPosts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, posts);
  });

  it('returns 500 on database error', async () => {
    MockPost.findAll.mock.mockImplementation(async () => {
      throw new Error('DB error');
    });

    const req = { query: { query: 'error' } };
    const res = makeRes();

    await searchPosts(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});
