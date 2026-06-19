import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendError } from '../utils/audit.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 400, 'Name, email, and password are required');
    }

    if (password.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 500, 'Registration failed');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'Login failed');
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 400, 'Refresh token required');
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return sendError(res, 401, 'Invalid refresh token');
    }

    const newAccessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    res.json({ accessToken: newAccessToken });
  } catch {
    sendError(res, 401, 'Invalid refresh token');
  }
});

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return sendError(res, 401, 'Authentication required');
    }

    const { verifyAccessToken } = await import('../utils/jwt.js');
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.userId).select('-password -refreshToken');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    sendError(res, 401, 'Invalid token');
  }
});

export default router;
