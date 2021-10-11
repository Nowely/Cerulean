import {IconButton, Menu, MenuItem} from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import React, {MouseEvent, useState} from "react";

export const UserMenu = () => {
	const [anchorEl, setAnchorEl] = useState<Element | null>(null);
	const open = Boolean(anchorEl);

	const handleMenu = (event: MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);

	};
	const handleClose = () => {
		setAnchorEl(null);
	};
	return <>
		<IconButton
			style={{right: 0, position: 'absolute'}}
			onClick={handleMenu}
			color="inherit"
			children={<PersonRoundedIcon/>}
		/>
		<Menu
			id="menu-appbar"
			anchorEl={anchorEl}
			keepMounted
			transformOrigin={{
				vertical: 'top',
				horizontal: 'right',
			}}
			open={open}
			onClose={handleClose}
		>
			<MenuItem onClick={handleClose}>Profile</MenuItem>
			<MenuItem onClick={handleClose}>My account</MenuItem>
		</Menu>
	</>
}