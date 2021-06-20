import {makeAutoObservable} from "mobx";

export class Store {
    private static _instance: Store;

    static get instance(): Store {
        if (!this._instance) {
            this._instance = new Store();
        }
        return this._instance;
    }

    a: number;
    b: number;

    private constructor() {
        this.a = 5;
        makeAutoObservable(this)
        this.b = 12;
    }
}