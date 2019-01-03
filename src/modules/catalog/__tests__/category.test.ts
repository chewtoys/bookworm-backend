import { Server } from "http";
import {
  CREATED,
  FORBIDDEN,
  NOT_FOUND,
  OK,
  UNAUTHORIZED,
  UNPROCESSABLE_ENTITY
} from "http-status-codes";
import "jest-extended";
import * as supertest from "supertest";
import { resetDatabase } from "../../../services/database";
import { IPaginatedResource } from "../../../services/paginate";
import startTestServer from "../../../test-server";
import { ILoginCredentials } from "../../auth/auth.contracts";
import { IApplicationUserData } from "../../user/user.contracts";
import userService from "../../user/user.service";
import { ICategory } from "../catalog.contracts";
import categoryService from "../category.service";

const API_URL = "/api";
const ENDPOINT = `${API_URL}/catalog/categories`;

// globals
let request: supertest.SuperTest<supertest.Test> = null;
let server: Server = null;
let adminJwt = "";

const testCategory: ICategory = {
  name: "Science fiction",
  seoUrl: "sci-fi"
};

const customerUser: IApplicationUserData = {
  email: "user@example.com",
  password: "12332112",
  active: true,
  firstName: "Peter",
  lastName: "Smith",
  role: "customer"
};

const listViewKeys = [
  "id",
  "name",
  "seoUrl",
  "parent",
  "parentId",
  "createdAt",
  "updatedAt"
];

const detailedViewKeys = [
  "id",
  "name",
  "seoUrl",
  "children",
  "parent",
  "parentId",
  "createdAt",
  "updatedAt"
];

// helper functions
async function generateAdminToken() {
  const adminUser: IApplicationUserData = {
    email: "admin@example.com",
    password: "12332112",
    active: true,
    firstName: "John",
    lastName: "Doe",
    role: "admin"
  };

  await userService.create(adminUser);

  const response = await request.post(`${API_URL}/login`).send({
    email: adminUser.email,
    password: adminUser.password
  } as ILoginCredentials);

  const jwt: string = response.body.token;

  return jwt;
}

async function generateCustomerToken() {
  await userService.create(customerUser);

  const response = await request.post(`${API_URL}/login`).send({
    email: customerUser.email,
    password: customerUser.password
  } as ILoginCredentials);

  const jwt: string = response.body.token;

  return jwt;
}

beforeAll(async done => {
  const _ = await startTestServer();
  server = _.server;
  request = _.request;
  done();
});

beforeEach(async () => {
  await resetDatabase();
  adminJwt = await generateAdminToken();
});

describe("Category resource", () => {
  describe(`GET ${ENDPOINT}`, () => {
    it("should list all categories with pagination", async () => {
      const response = await request.get(ENDPOINT);

      expect(response.status).toEqual(OK);

      const responseBody: IPaginatedResource<ICategory> = response.body;

      expect(responseBody.items).toHaveLength(0);
      expect(responseBody.itemsCount).toEqual(0);
      expect(responseBody.page).toEqual(1);
      expect(responseBody.pageSize).toEqual(25);
      expect(responseBody.total).toEqual(0);
    });

    it("should correctly paginate through categories", async () => {
      const categoriesToInsert: ICategory[] = Array.from({ length: 50 }).map(
        (_, i) => {
          return {
            seoUrl: "cat-" + i,
            name: "Category #" + i
          } as ICategory;
        }
      );

      await Promise.all(
        categoriesToInsert.map(cat => categoryService.create(cat))
      );

      const response = await request.get(ENDPOINT).query({
        page_size: 10,
        page: 2
      });

      expect(response.status).toEqual(OK);

      const responseBody: IPaginatedResource<ICategory> = response.body;

      expect(responseBody.items).toHaveLength(10);
      expect(responseBody.itemsCount).toEqual(10);
      expect(responseBody.page).toEqual(2);
      expect(responseBody.pageSize).toEqual(10);
      expect(responseBody.total).toEqual(50);

      responseBody.items.forEach(category => {
        expect(category).toContainAllKeys(listViewKeys);
      });
    });
  });

  describe(`GET ${ENDPOINT}/:categoryId`, () => {
    it("should get category record by its ID", async () => {
      const category = await categoryService.create(testCategory);
      const response = await request.get(`${ENDPOINT}/${category.id}`);

      expect(response.status).toEqual(OK);

      const responseBody: ICategory = response.body;

      expect(responseBody.name).toEqual(testCategory.name);
      expect(responseBody.id).toEqual(category.id);
      expect(responseBody.children).toEqual([]);
      expect(responseBody.parent).toEqual(null);
      expect(responseBody).toContainAllKeys(detailedViewKeys);
    });

    it("should get the category's children in the response", async () => {
      const parentCategory = await categoryService.create({ name: "parent" });
      const category = await categoryService.create({
        ...testCategory,
        parentId: parentCategory.id
      });

      const response = await request.get(`${ENDPOINT}/${parentCategory.id}`);

      expect(response.status).toEqual(OK);

      const responseBody: ICategory = response.body;

      expect(responseBody.name).toEqual(parentCategory.name);
      expect(responseBody.id).toEqual(parentCategory.id);
      expect(responseBody.children[0].name).toEqual(category.name);
      expect(responseBody.children[0].id).toEqual(category.id);
      expect(responseBody.parent).toEqual(null);
      expect(responseBody).toContainAllKeys(detailedViewKeys);
    });

    it("should have status 404 when category with that ID does not exist", async () => {
      const response = await request.get(`${ENDPOINT}/42`);

      expect(response.status).toEqual(NOT_FOUND);
    });
  });

  describe(`PATCH ${ENDPOINT}/:categoryId`, () => {
    it("should update category record with the data provided", async () => {
      const category = await categoryService.create(testCategory);

      const updates: Partial<ICategory> = {
        name: "Updated category name",
        seoUrl: "updated-category-name"
      };

      const response = await request
        .patch(`${ENDPOINT}/${category.id}`)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send(updates);

      expect(response.status).toEqual(OK);

      // check if the response has the updated values
      const responseBody: ICategory = response.body;
      expect(responseBody.name).toEqual(updates.name);
      expect(responseBody.seoUrl).toEqual(updates.seoUrl);

      // check if the record is persisted
      const updatedCategory = await categoryService.getById(category.id);
      expect(updatedCategory.name).toEqual(updates.name);
      expect(updatedCategory.seoUrl).toEqual(updates.seoUrl);
    });

    it("should set category's parent", async () => {
      const category = await categoryService.create(testCategory);
      const parentCategory = await categoryService.create({
        name: "parent"
      });

      const response = await request
        .patch(`${ENDPOINT}/${category.id}`)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send({
          parentId: parentCategory.id
        });

      expect(response.status).toEqual(OK);

      // check if the response has the updated values
      const responseBody: ICategory = response.body;
      expect(responseBody.parentId).toEqual(parentCategory.id);

      // check if the record is persisted
      const updatedCategory = await categoryService.getById(category.id);
      expect(updatedCategory.parent).toEqual({
        ...parentCategory.toJSON(),
        parentId: null
      });
    });

    it("should remove category's parent", async () => {
      const parentCategory = await categoryService.create({
        name: "parent"
      });
      const category = await categoryService.create({
        ...testCategory,
        parentId: parentCategory.id
      });

      const response = await request
        .patch(`${ENDPOINT}/${category.id}`)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send({
          parentId: null
        });

      expect(response.status).toEqual(OK);

      // check if the response has the updated values
      const responseBody: ICategory = response.body;
      expect(responseBody.parentId).toBeNull();

      // check if the record is persisted
      const updatedCategory = await categoryService.getById(category.id);
      expect(updatedCategory.parent).toBeNull();
    });

    it("should respond with status 404 when an category does not exist", async () => {
      const response = await request
        .patch(`${ENDPOINT}/42`)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send({});

      expect(response.status).toBe(NOT_FOUND);
    });

    it("should not allow category updates by unauthenticated users", async () => {
      const category = await categoryService.create(testCategory);
      const response = await request
        .patch(`${ENDPOINT}/${category.id}`)
        .send({});

      expect(response.status).toBe(UNAUTHORIZED);
    });

    it("should not allow category updates by customers", async () => {
      const customerToken = await generateCustomerToken();
      const category = await categoryService.create(testCategory);
      const response = await request
        .patch(`${ENDPOINT}/${category.id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({});

      expect(response.status).toBe(FORBIDDEN);
    });
  });

  describe(`POST ${ENDPOINT}`, () => {
    it("should create a new category", async () => {
      const response = await request
        .post(ENDPOINT)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send(testCategory);

      const responseBody: ICategory = response.body;

      expect(response.status).toEqual(CREATED);
      expect(responseBody.seoUrl).toEqual(testCategory.seoUrl);
      expect(responseBody.name).toEqual(testCategory.name);
      expect(responseBody.seoUrl).toEqual(testCategory.seoUrl);
    });

    it("should not create a new category with an existing category's name", async () => {
      await request
        .post(ENDPOINT)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send(testCategory);

      const response = await request
        .post(ENDPOINT)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send(testCategory);

      expect(response.status).toEqual(UNPROCESSABLE_ENTITY);
      expect(response.body.message).toEqual("Validation failed.");
    });

    it("should not create a new category with an existing category's SEO URL", async () => {
      const category: Partial<ICategory> = {
        name: "cat",
        seoUrl: "cat"
      };

      await request
        .post(ENDPOINT)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send(category);

      category.name = "cat 2";

      const response = await request
        .post(ENDPOINT)
        .set("Authorization", `Bearer ${adminJwt}`)
        .send(category);

      expect(response.status).toEqual(UNPROCESSABLE_ENTITY);
      expect(response.body.message).toEqual("Validation failed.");
    });

    it("should not allow unauthenticated users to create new categories", async () => {
      const response = await request.post(ENDPOINT).send(testCategory);

      expect(response.status).toEqual(UNAUTHORIZED);
    });

    it("should not allow customers to create new categories", async () => {
      const token = await generateCustomerToken();
      const response = await request
        .post(ENDPOINT)
        .send(testCategory)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(FORBIDDEN);
    });
  });
});

afterAll(() => {
  server.close();
});
