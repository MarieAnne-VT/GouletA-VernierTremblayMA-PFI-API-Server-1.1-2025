import Model from './model.js';
import PostModel from './post.js';              // important pour addDeleteCascade
import PostLikeModel from './postlike.js';      // important pour addDeleteCascade

export default class User extends Model {
    constructor()
    {
        super(true);
        this.addField('Name', 'string');
        this.addField('Email', 'email');        
        this.addField('Password', 'string');
        this.addField('Avatar', 'asset');
        this.addField('Created','integer');
        this.addField('VerifyCode','string');
        this.addField('Authorizations','object');
        this.setKey("Email");

        /* Lors d'un retrait d'un User effacer tous ses Posts 
           ainsi que tous leurs PostLikes 
           Voir dans le constructeur du model Post */
        this.addDeleteCascades(PostModel, "OwnerId");
        /* Lors d'un retrait d'un User effacer tous ses PostLikes */
        this.addDeleteCascades(PostLikeModel, "UserId");
    }

    bindExtraData(user) {
        user.Password = "************";
        if (user.VerifyCode !== "verified") user.VerifyCode = "unverified";
        user.isBlocked = user.Authorizations.readAccess < 0;
        user.isSuper = user.Authorizations.readAccess == 2 && user.Authorizations.writeAccess == 2;
        user.isAdmin = user.Authorizations.readAccess == 3 && user.Authorizations.writeAccess == 3;
        return user;
    }
}