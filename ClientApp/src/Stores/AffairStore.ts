import {makeAutoObservable} from "mobx";
import {Affair} from "../Models/Affair";

export class AffairStore {
    //region Singleton
    private static _instance: AffairStore;

    static get instance(): AffairStore {
        if (!this._instance) {
            this._instance = new AffairStore();
        }
        return this._instance;
    }

    private constructor() {
        makeAutoObservable(this)
    }

    //endregion

    affairs: Affair[] = [];
}