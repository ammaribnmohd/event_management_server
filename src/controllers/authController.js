const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const env = require("../config/env");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { loginSchema, registerAdminSchema } = require("../validation/schemas");

const register = asyncHandler(async (req, res) => {
  const parsed = registerAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((item) => item.message).join("\n"));
  }

  const { username, email, phone, password } = parsed.data;

  const existing = await Admin.findOne({
    $or: [{ username }, { email }, { phone }],
  })
    .select("_id")
    .lean();

  if (existing) {
    throw new ApiError(400, "Username, email, or phone already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await Admin.create({ username, email, phone, password: hashedPassword });

  res.status(201).json({ success: true, message: "Registration successful. You can now login." });
});

const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((item) => item.message).join("\n"));
  }

  const { username, password } = parsed.data;
  const admin = await Admin.findOne({ username });

  if (!admin) {
    throw new ApiError(401, "Invalid username or password");
  }

  const matched = await bcrypt.compare(password, admin.password);
  if (!matched) {
    throw new ApiError(401, "Invalid username or password");
  }

  const token = jwt.sign({ id: admin._id.toString(), username: admin.username }, env.jwtSecret, {
    expiresIn: "1d",
  });

  res.json({
    success: true,
    token,
    admin: {
      id: admin._id.toString(),
      username: admin.username,
    },
  });
});

module.exports = {
  register,
  login,
};
