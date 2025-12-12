// Méthode suggérée: StoreAccessToken
// toggleLike
// getBearerAuthorizationToken : return autorization, bearer, token


class Posts_API {
    static serverHost() {
        // return "https://linuxapiserver.azurewebsites.net";
        return "https://pfi-gouleta-vernier-tremblerma-hrdpc7bkhug2gbce.eastus-01.azurewebsites.net";
    }
    static POSTS_API_URL() { return this.serverHost() + "/api/posts" };
    static LIKES_API_URL() { return this.serverHost() + "/api/postlikes" };

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.POSTS_API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Get(id = null) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.POSTS_API_URL() + (id != null ? "/" + id : ""),
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetQuery(queryString = "") {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.POSTS_API_URL() + queryString,
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Save(data, create = true) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.POSTS_API_URL() : this.POSTS_API_URL() + "/" + data.Id,
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Delete(id) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.POSTS_API_URL() + "/" + id,
                type: "DELETE",
                success: () => {
                    resolve(true);
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }

    static async ToggleLike(postId) {
        const loggedUser = Users_API.RetrieveLoggedUser();
        if (!loggedUser) {
            showError("Vous devez être connecté pour aimer un post.");
            return null;
        }

        this.initHttpState();

        // Vérifier si l'utilisateur a déjà liké le post
        let existingLike = await this.GetLikesForPost(postId)
            .then(likes => likes.find(like => like.UserId === loggedUser.Id))
            .catch(() => null);

        if (existingLike) {
            // Supprimer le like existant
            return new Promise(resolve => {
                $.ajax({
                    url: this.LIKES_API_URL() + `/${existingLike.Id}`,
                    type: "DELETE",
                    contentType: "application/json",
                    success: async () => {
                        const updatedLikes = await this.GetLikesForPost(postId);
                        resolve(updatedLikes);
                    },
                    error: xhr => { 
                        this.setHttpErrorState(xhr); 
                        resolve(null); 
                    }
                });
            });
        } else {
            // Ajouter un nouveau like
            const payload = { PostId: postId, UserId: loggedUser.Id };
            return new Promise(resolve => {
                $.ajax({
                    url: this.LIKES_API_URL(),
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(payload),
                    success: async () => {
                        const updatedLikes = await this.GetLikesForPost(postId);
                        resolve(updatedLikes);
                    },
                    error: xhr => {
                        this.setHttpErrorState(xhr);
                        resolve(null);
                    }
                });
            });
        }
    }

    static async GetLikesForPost(postId) {
        this.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.LIKES_API_URL() + `?PostId=${postId}`,
                complete: data => resolve(data.responseJSON),
                error: xhr => { this.setHttpErrorState(xhr); resolve([]); }
            });
        });
    }
}