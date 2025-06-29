import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { config } from '../config';
import { createUser, findUserByEmail, findUserById, updateUser } from '../services/user';
import { logger } from '../utils/logger';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error, null);
  }
});

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: config.githubClientId,
  clientSecret: config.githubClientSecret,
  callbackURL: `${config.apiUrl}/auth/github/callback`,
  scope: ['repo', 'user:email'], // Minimal permissions: repo access and email
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
    
    // Check if user already exists
    let user = await findUserByEmail(email);
    
    if (user) {
      // Update existing user with GitHub info
      user = await updateUser(user.id, {
        githubId: profile.id,
        githubUsername: profile.username,
        githubAccessToken: accessToken,
        avatarUrl: profile.photos?.[0]?.value,
        name: profile.displayName || profile.username,
      });
    } else {
      // Create new user
      user = await createUser({
        email,
        name: profile.displayName || profile.username,
        githubId: profile.id,
        githubUsername: profile.username,
        githubAccessToken: accessToken,
        avatarUrl: profile.photos?.[0]?.value,
        subscription: 'FREE',
        provider: 'github',
      });
    }
    
    logger.info('GitHub OAuth success', { userId: user.id, email: user.email });
    return done(null, user);
  } catch (error) {
    logger.error('GitHub OAuth error:', error);
    return done(error, null);
  }
}));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: `${config.apiUrl}/auth/google/callback`,
  scope: ['profile', 'email'],
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value;
    
    if (!email) {
      return done(new Error('No email provided by Google'), null);
    }
    
    // Check if user already exists
    let user = await findUserByEmail(email);
    
    if (user) {
      // Update existing user with Google info
      user = await updateUser(user.id, {
        googleId: profile.id,
        googleAccessToken: accessToken,
        avatarUrl: profile.photos?.[0]?.value,
        name: profile.displayName,
      });
    } else {
      // Create new user
      user = await createUser({
        email,
        name: profile.displayName,
        googleId: profile.id,
        googleAccessToken: accessToken,
        avatarUrl: profile.photos?.[0]?.value,
        subscription: 'FREE',
        provider: 'google',
      });
    }
    
    logger.info('Google OAuth success', { userId: user.id, email: user.email });
    return done(null, user);
  } catch (error) {
    logger.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
  issuer: 'accessibility-scanner',
  audience: 'accessibility-scanner-users',
}, async (payload: any, done: any) => {
  try {
    const user = await findUserById(payload.id);
    
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (error) {
    logger.error('JWT authentication error:', error);
    return done(error, false);
  }
}));

export default passport;