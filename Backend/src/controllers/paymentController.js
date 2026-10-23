const paymentService = require("../services/paymentService");
const razorpay = require("../services/razorpayGateway");
const { handleControllerError } = require("../utils/errors");

class PaymentController {
    configuration(req, res) {
        return res.status(200).json({
            success: true,
            data: paymentService.configuration()
        });
    }

    async webhook(req, res) {
        const signature = req.get("x-razorpay-signature");
        if (!razorpay.verifyWebhookSignature(req.rawBody, signature)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Razorpay webhook signature"
            });
        }
        try {
            await paymentService.handleWebhook(req.body);
            return res.status(200).json({ success: true });
        } catch (error) {
            return handleControllerError(res, error, "Failed to process Razorpay webhook");
        }
    }
}

module.exports = new PaymentController();
