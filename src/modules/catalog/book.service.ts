import { badData, notFound } from "boom";
import Book from "../../models/Book";
import paginate, {
  IPaginatedResource,
  IPaginationQuery
} from "../../services/paginate";
import { IBook, IBookListItem } from "./catalog.contracts";

class BookService {
  async getAll(query: IPaginationQuery<Book>) {
    const books: IPaginatedResource<IBookListItem> = await paginate(Book, {
      ...query,
      scope: "listItem"
    });
    return books;
  }

  async getAllByCategoryId(categoryId: string, query: IPaginationQuery<Book>) {
    const books: IPaginatedResource<IBookListItem> = await paginate(Book, {
      ...query,
      where: {
        categoryId: categoryId
      },
      scope: "listItem"
    });

    return books;
  }

  async getById(bookId = "") {
    const book = await Book.scope("detailed").findByPrimary(bookId);

    if (!book) {
      throw notFound("Book not found.");
    }

    return book;
  }

  async create(bookData: Partial<IBook>) {
    const bookModel = Book.build(bookData);

    try {
      await bookModel.validate();
    } catch (error) {
      throw badData("Validation failed.", error);
    }

    try {
      const createdBook = await bookModel.save();
      return this.getById(createdBook.id);
    } catch (error) {
      throw badData("Validation failed.", error);
    }
  }

  async edit(bookId = "", bookData: Partial<IBook> = {}) {
    const bookToEdit = await this.getById(bookId);

    for (const key in bookData) {
      if (bookData.hasOwnProperty(key) && typeof bookData[key] !== undefined) {
        bookToEdit.set(key, bookData[key]);
      }
    }

    try {
      const updatedBook = await bookToEdit.save();
      return this.getById(updatedBook.id);
    } catch (error) {
      throw badData("Validation failed.", error);
    }
  }

  async remove(bookId = "") {
    const bookToRemove = await this.getById(bookId);

    try {
      await bookToRemove.destroy();
      return bookToRemove;
    } catch (error) {
      throw badData("Validation failed.", error);
    }
  }
}

export default new BookService();
