// PromoteUser / BlockUser
// ModifyUser
// GetAccounts (pour admin)

class Users_API {
    static serverHost() {
        return "https://pfi-gouleta-vernier-tremblerma-hrdpc7bkhug2gbce.eastus-01.azurewebsites.net";
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
    static checkConflictURL() {
        return this.serverHost() + "/accounts/conflict";
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
        /*initTimeout(10, () => {
            Users_API.Logout(this.RetrieveLoggedUser());
        });*/

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
        let token = this.RetrieveToken();
        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/accounts/modify", // utilise Email comme clé
                type: "PUT",
                contentType: "application/json",
                headers: {"authorization": token},
                data: JSON.stringify(user),
                success: (data) => resolve(data),
                error: (xhr) => { this.setHttpErrorState(xhr); resolve(null); }
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
    }

    // ---------------------------
    // VERIFY USER
    // ---------------------------
    static async Verify(verifyInfo) {
        this.initHttpState();
        /*initTimeout(10, () => {
            Users_API.Logout(this.RetrieveLoggedUser());
        });*/

        return new Promise(resolve => {
            $.ajax({
                url: this.serverHost() + "/Accounts/verify",
                type: "GET",
                contentType: "application/json",
                data: {id: verifyInfo.Id, code: verifyInfo.VerifyCode},
                success: (data) => {
                    resolve(data);
                },
                error: (xhr) => { 
                    this.setHttpErrorState(xhr); 
                    resolve(null); 
                }
            });
        });
    }
}