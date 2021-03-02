import axios from "axios";

export class Task {
	static get = async (callback) => {
		try {
			const response = await axios.get(`task`);
			callback.call(this, response);
		} catch (e) {
			console.error(e);
		}
	}
	static create = async (task) => {
		try {
			await axios.post(`task`, {...task});
		} catch (e) {
			console.error(e);
		}
	}
	static update = async (task) => {
		try {
			await axios.put(`task`, task);
		} catch (e) {
			console.error(e);
		}
	}
	static delete = async (id) => {
		try {
			await axios.delete(`task`, {params: {id}});
		} catch (e) {
			console.error(e);
		}
	}
}
