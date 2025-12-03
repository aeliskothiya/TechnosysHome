import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserGoogle from "../models/userGoogleModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserGoogle.findOne({ googleId: profile.id });
        if (!user) {
          user = await UserGoogle.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            picture: profile.photos?.[0]?.value,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserGoogle.findById(id);
    done(null, user);
  } catch (e) {
    done(e, null);
  }
});

export default passport;
