// PromoteUser / BlockUser
// ModifyUser
// GetAccounts (pour admin)

class Users_API {
    static serverHost() {
        return "http://localhost:5000";
    }

    static USERS_API_URL() { 
        return this.serverHost() + "/api/accounts"; 
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
    static checkConflictURL() {
        return this.serverHost() + "/accounts/conflict";
    }

    static RetrieveLoggedUser() {
    let data = sessionStorage.getItem("loggedUser");
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed.User ?? null;
    }

    static RetrieveToken() {
        let data = sessionStorage.getItem("loggedUser");
        if (!data) return null;

        const parsed = JSON.parse(data);
        return parsed.Access_token ?? null;
    }

    // ---------------------------
    // LOGIN
    // ---------------------------
    static async Login(credentials) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/token", // login reste séparé
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(credentials),
                success: (data) => {
                    sessionStorage.setItem("loggedUser", JSON.stringify(data));
                    resolve(data);
                },
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
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
                url: this.USERS_API_URL() + `/logout/?userId=${user.Id}`,
                type: "GET",
                complete: (data) => {
                    sessionStorage.removeItem("loggedUser");
                    resolve(data.responseJSON);
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
                url: this.USERS_API_URL() + "/register",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(newUser),
                success: (data) => resolve(data),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // VERIFY USER
    // ---------------------------
    static async Verify(verifyInfo) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.USERS_API_URL() + "/verify",
                type: "GET",
                contentType: "application/json",
                data: { id: verifyInfo.Id, code: verifyInfo.VerifyCode },
                success: (data) => resolve(data),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // MODIFY USER
    // ---------------------------
    static async Update(user) {
        this.initHttpState();
        let token = this.RetrieveToken();
        return new Promise(resolve => {
            $.ajax({
                url: this.USERS_API_URL() + "/modify",
                type: "PUT",
                contentType: "application/json",
                headers: { "authorization": token },
                data: JSON.stringify(user),
                success: (data) => resolve(data),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // Commencé Promote / Block / Remove mais pas terminé
    // ---------------------------
    // PROMOTE USER
    // ---------------------------
    /*static async Promote(userId) {
        this.initHttpState();
        let token = this.RetrieveToken();
        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/accounts/promote",
                type: "POST",
                contentType: "application/json",
                headers: { "authorization": token },
                data: JSON.stringify({ Id: userId }),
                success: data => resolve(data),
                error: xhr => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // BLOCK USER
    // ---------------------------
    static async Block(userId) {
        this.initHttpState();
        let token = this.RetrieveToken();
        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/accounts/block",
                type: "POST",
                contentType: "application/json",
                headers: { "authorization": token },
                data: JSON.stringify({ Id: userId }),
                success: data => resolve(data),
                error: xhr => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

    // ---------------------------
    // REMOVE USER
    // ---------------------------
    static async Remove(userId) {
        this.initHttpState();
        let token = this.RetrieveToken();
        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/accounts/remove/" + userId,
                type: "GET", // ou DELETE si tu modifies ton routeur
                contentType: "application/json",
                headers: { "authorization": token },
                success: data => resolve(data),
                error: xhr => { this.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }*/

    // ---------------------------
    // GET ALL USERS (ADMIN ONLY)
    // ---------------------------
    static async GetAll() {
        this.initHttpState();
        const token = this.RetrieveToken(); // récupère le token du sessionStorage
        return new Promise(resolve => {
            $.ajax({
                url: this.USERS_API_URL(),
                headers: { "Authorization": `Bearer ${token}` }, // <-- obligatoire
                complete: data => {
                    resolve({ 
                        ETag: data.getResponseHeader('ETag'),
                        data: data.responseJSON 
                    });
                },
                error: (xhr) => { 
                    this.setHttpErrorState(xhr); 
                    resolve(null); 
                }
            });
        });
    }
}