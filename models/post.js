import Model from './model.js';
import UserModel from './user.js';              // important pour addBind
import PostLikeModel from './postlike.js';      // important pour addJoint et addDeleteCascade
export default class Post extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('Title', 'string');
        this.addField('Text', 'string');
        this.addField('Category', 'string');
        this.addField('Image', 'asset');
        this.addField('Date', 'integer');

        this.setKey("Title");
    
        /* Ajouter un champs Likes dynamiquement qui contiendra une jointure entre post.Id et UserModel via la table de jointure Postlikes */
        this.addJoint('Likes', PostLikeModel, UserModel, "Name");

        /* Ajouter un champ Owner qui contiendra les données Name et Avatar de l'usager créateur */
        this.addBind('OwnerId', UserModel, 'Name, Avatar');

        /* Lors d'un retrait d'un Post effacer tous les PostLikes qui sont lui sont associés */
        this.addDeleteCascades(PostLikeModel, "PostId");
    }
}