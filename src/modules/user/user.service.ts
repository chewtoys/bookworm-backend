import { badData } from "boom";
import ApplicationUser, { UserRole } from "../../models/ApplicationUser";
import paginate, { IPaginationQuery } from "../../services/paginate";

export interface IApplicationUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  active?: boolean;
}

class UserService {
  async getByUsername(username = "") {
    return ApplicationUser.findOne({
      where: {
        email: username
      }
    });
  }

  async getAll(pagination: IPaginationQuery<ApplicationUser>) {
    return paginate(ApplicationUser, pagination);
  }

  async create(userData: IApplicationUserData) {
    try {
      const userObj = ApplicationUser.build(userData);
      const createdUser = await userObj.save();
      return createdUser;
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw badData(
          `User with email ${userData.email} has already been registered.`
        );
      } else if (error.name === "SequelizeValidationError") {
        throw badData("Failed validation.", error.errors);
      } else {
        throw error;
      }
    }
  }
}

export default new UserService();