import jwt from 'jsonwebtoken';
import UserModel, { IUser, UserRole } from '../models/User';

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IRegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface ILoginInput {
  email: string;
  password: string;
}

export class AuthService {
  private JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
  private JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
  private JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
  private JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

  async register(input: IRegisterInput): Promise<IUser> {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: input.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new UserModel({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      role: input.role || UserRole.CUSTOMER,
    });

    await user.save();
    return user;
  }

  async login(input: ILoginInput): Promise<{ user: IUser; tokens: IAuthTokens }> {
    // Find user by email
    const user = await UserModel.findOne({ email: input.email }).select(
      '+password'
    );
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Return user without password
    user.password = undefined as any;
    return { user, tokens };
  }

  generateTokens(user: IUser): IAuthTokens {
    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      this.JWT_SECRET,
      {
        expiresIn: this.JWT_EXPIRY,
      } as any
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id.toString(),
      },
      this.JWT_REFRESH_SECRET,
      {
        expiresIn: this.JWT_REFRESH_EXPIRY,
      } as any
    );

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string): Promise<IAuthTokens> {
    try {
      const decoded: any = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET);
      const user = await UserModel.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }
}

export default new AuthService();
