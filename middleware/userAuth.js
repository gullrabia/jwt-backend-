import jwt from 'jsonwebtoken';

const userAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, login again'
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // ✅ Correct way
        req.userId = decoded.id;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

export default userAuth;