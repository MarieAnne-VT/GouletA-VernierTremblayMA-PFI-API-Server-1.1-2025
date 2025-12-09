// PromoteUser / BlockUser
// ModifyUser
// GetAccounts (pour admin)

class Users_API {
    static serverHost() {
        return "http://localhost:5000";
    }

    static USERS_API_URL() { 
        return this.serverHost() + "/api/users"; 
    }

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }

    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description || xhr.responseJSON.error;
        else
            this.currentHttpError = xhr.statusText === 'error' ? "Service introuvable" : xhr.statusText;

        this.currentStatus = xhr.status;
        this.error = true;
    }
    static checkConflictURL(userId = null) {
        let url = this.serverHost() + "/accounts/conflict"
        if (userId) {
            url += `?userId=${userId}`;
        }
        return url;
    }
    // ---------------------------
    // GET ALL USERS
    // ---------------------------
    static async GetAll() {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.USERS_API_URL(),
                complete: data => {
                    resolve({ 
                        ETag: data.getResponseHeader('ETag'),
                        data: data.responseJSON 
                    });
                },
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    static RetrieveLoggedUser() {
    let data = sessionStorage.getItem("loggedUser");
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed.User ?? null;
    }


    // ---------------------------
    // LOGIN
    // ---------------------------
    static async Login(credentials) {
        this.initHttpState();
        initTimeout(10, () => {
            Users_API.Logout(this.RetrieveLoggedUser());
        });

        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/token",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(credentials),
                success: (data) => {
                    sessionStorage.setItem("loggedUser", JSON.stringify(data));
                    resolve(data);
                },
                error: (xhr) => { 
                    this.setHttpErrorState(xhr); 
                    resolve(null); 
                }
            });
        });
    }

    // ---------------------------
    // LOGOUT
    // ---------------------------
    static async Logout(user) {
        this.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/Accounts/logout/?userId=" + user.Id,
                type: "GET",
                data: { userId: user.Id },
                contentType: "application/json",
                // success: (data) => resolve(data),
                complete: (data) => {
                    sessionStorage.removeItem("loggedUser");
                    resolve(data.responseJSON)
                },
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // REGISTER
    // ---------------------------
    static async Register(newUser) {
        this.initHttpState();

        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/Accounts/register",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(newUser),
                success: (data) => resolve(data),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // UPDATE USER
    // ---------------------------
    static async Update(user) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.USERS_API_URL() + "/" + user.Email, // utilise Email comme clé
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify(user),
                success: (data) => resolve(data),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // DELETE USER
    // ---------------------------
    static async Delete(email) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.USERS_API_URL() + "/" + email, // utilise Email comme clé
                type: "DELETE",
                success: () => resolve(true),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
}