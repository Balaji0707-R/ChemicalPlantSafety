import UserModel from "../models/user.js";
import { serializeUserApiDto } from "../models/serializers.js";

export interface User {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export const getAllUsers = async (): Promise<User[]> => {
  const users = await UserModel.find({ is_active: true })
    .select({
      user_id: 1,
      role_id: 1,
      full_name: 1,
      email: 1,
      is_active: 1,
      _id: 0,
    })
    .sort({ full_name: 1 })
    .lean();

  return users.map(serializeUserApiDto);
};
