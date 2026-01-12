const validator = {
    isEmail: (email) => {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    },
    
    isUsername: (username) => {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        return usernameRegex.test(username) && username.length >= 3 && username.length <= 30;
    },
    
    isPassword: (password) => {
        return password && password.length >= 6 && password.length <= 128;
    },
    
    sanitizeString: (str, maxLength = 255) => {
        if (typeof str !== 'string') return '';
        return str.trim()
            .slice(0, maxLength)
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .replace(/data:/gi, ''); // Remove data: protocol
    },
    
    // Enhanced validation for usernames
    isValidUsername: (username) => {
        if (typeof username !== 'string') return false;
        if (username.length < 3 || username.length > 30) return false;
        
        // Check for valid characters
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
        
        // Prevent reserved words
        const reserved = ['admin', 'system', 'root', 'null', 'undefined', 'anonymous'];
        if (reserved.includes(username.toLowerCase())) return false;
        
        return true;
    },
    
    isValidScore: (score) => {
        return Number.isInteger(score) && score >= 0 && score <= 1000000;
    },
    
    isValidGameTime: (time) => {
        return Number.isInteger(time) && time >= 0 && time <= 3600; // Max 1 hour
    }
};

export default validator;
