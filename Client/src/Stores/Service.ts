import {makeAutoObservable} from "mobx";
import axios from "axios";

export class Service<T extends { id: string }> {
	data: T[] = []

	constructor(readonly url: string) {
		makeAutoObservable(this)
	}

	async get() {
		try {
			const response = await axios.get(this.url);
			this.data = response.data;
		} catch (e) {
			console.error(e);
		}
	}

	async create(value: T) {
		this.data.push(value);
		try {
			await axios.post(this.url, {...value});
		} catch (e) {
			console.error(e);
		}
	}

	async update(partValue: Partial<T> & { id: string }) {
		const value = this.data.find(d => d.id === partValue.id);
		if (!value) return;
		Object.assign(value, partValue);

		try {
			await axios.put(this.url, value);
		} catch (e) {
			console.error(e);
		}
	}

	async delete(id: string) {
		try {
			await axios.delete(this.url, {params: {id}});
			this.data = this.data.filter((value) => value.id !== id)
		} catch (e) {
			console.error(e);
		}
	}
}