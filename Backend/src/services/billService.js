const billRepository = require("../repositories/billRepository");
const { parsePositiveId } = require("../utils/validation");

class BillService {
    getBill(user, orderId) {
        const id = parsePositiveId(orderId, "order ID");
        return billRepository.getOrCreateBill(
            id,
            user.user_id,
            user.role === "ADMIN"
        );
    }
}

module.exports = new BillService();
