// Zod-powered request body validation middleware.
// Usage: router.post('/register', validate(registerSchema), controller.register)
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  req.body = result.data; // parsed + coerced values
  next();
};

module.exports = { validate };
