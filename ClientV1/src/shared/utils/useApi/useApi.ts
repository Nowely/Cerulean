import {useQuery} from "react-query";
import createClient from "openapi-fetch";
import {paths} from "./api/v1";

const {GET} = createClient<paths>()
GET("/Affair", {
	params: {
		query: {
			Title: 'ads'
		}
	}
})
