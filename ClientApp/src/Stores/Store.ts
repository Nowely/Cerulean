import {makeAutoObservable} from "mobx";
import {AffairStore} from "./AffairStore";

export class Store {
    //region Singleton
    private static _instance: Store;

    private constructor() {
        makeAutoObservable(this)
    }

    static get instance(): Store {
        return this._instance || (this._instance = new this());
    }

    //endregion

    affair: AffairStore = AffairStore.instance;
}