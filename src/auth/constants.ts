export const jwtConstants = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/', // или '/auth/refresh'
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
