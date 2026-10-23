const billService = require("../services/billService");
const { handleControllerError } = require("../utils/errors");

class BillController {
    async getBill(req, res) {
        try {
            return res.status(200).json({
                success: true,
                data: await billService.getBill(req.user, req.params.orderId)
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch bill");
        }
    }

    async downloadBill(req, res) {
        try {
            const data = await billService.getBill(req.user, req.params.orderId);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${data.bill.bill_number}.json"`
            );
            return res.status(200).send(JSON.stringify({ success: true, data }, null, 2));
        } catch (error) {
            return handleControllerError(res, error, "Failed to download bill");
        }
    }
}

module.exports = new BillController();
