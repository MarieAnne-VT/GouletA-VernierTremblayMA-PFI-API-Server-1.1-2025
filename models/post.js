import Model from './model.js';

export default class Post extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('Title', 'string');
        this.addField('Text', 'string');
        this.addField('Category', 'string');
        this.addField('Image', 'asset');
        this.addField('Date', 'integer');

        this.setKey("Title");
    }

    // Ajouter join avec bindExtraData()
    // this.join (extends de Model)
    bindExtraData(post) {
        this.join(post, "Likes", Like, User, "Name");
        return post;
    }
}