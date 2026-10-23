class User {
constructor({
user_id,
full_name,
email,
phone,
role,
created_at,
updated_at
}) {
this.user_id = user_id;
this.full_name = full_name;
this.email = email;
this.phone = phone;
this.role = role;
this.created_at = created_at;
this.updated_at = updated_at;
}
}

module.exports = User;
