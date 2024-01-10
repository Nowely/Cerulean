import {makeAutoObservable, toJS} from "mobx";
import {AffairStore} from "./AffairStore";
import {Service} from "./Service";
import {Affair} from "../Models/Affair";
import {Page} from "../Models/Page";
import {User} from "../Models/User";

class Store {
    //affair = new AffairStore()
    affairs = new Service<Affair>('affair')
    pages = new Service<Page>('page')
    users = new Service<User>('user')

    constructor() {
        makeAutoObservable(this)
        this.init()
    }

    async init() {
        await this.users.get()
        await this.pages.get()
        console.log(toJS(this.pages.data))
    }

}

export const store = new Store()