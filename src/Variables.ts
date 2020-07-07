///<reference path="./types/types.d.ts" />

/*
EXAMPLES:
cost of sending and receiving an object migration
cost of sending and receiving an aura creation
cost of sending and receiving an aura update
cost of sending and receiving an aura deletion
cost of maintaining an aura on the sending and receiving side
and then of course cost of simulating an object, but this is really dependent on what it is doing (sleeping or not, number of contacts, number of nearby objects)
then you can calculate the cost of having a boundary in particular place, depending on all the above factors
there's also the cost of number of objects that are completely out of their host server's region as the islands check has to be performed on them
*/

export const constants: Variables = {
	C_m: {
		desc: "Cost of sending and receiving an object migration",
		defaultValue: 1
	},
	C_c: {
		desc: "Cost of sending and receiving an aura creation",
		defaultValue: 1
	},
	C_u: {
		desc: "Cost of sending and receiving an aura update",
		defaultValue: 1
	},
	C_d: {
		desc: "Cost of sending and receiving an aura deletion",
		defaultValue: 1
	},
	C_i: {
		desc: "Cost of number of objects out of host region (islands)",
		defaultValue: 1
	}
}

export const globalVars: Variables = {
	sigma: {
		type: "count",
		desc: "Number of servers"
	},
	N: {
		type: "count",
		desc: "Total number of objects in the world"
	},
	t: {
		type: "count",
		desc: "Time since boundaries were last moved (seconds)"
	}
}

export const localVars: Variables = {
	lambda: {
		type: "proportion",
		desc: "CPU load of the server",
	},
	delta: {
		type: "count",
		desc: "Frame time for the physics simulation step (milliseconds)",
	},
	alpha: {
		type: "proportion",
		desc: "Number of active (awake) objects",
	},
	beta: {
		type: "proportion",
		desc: "Proportion of objects near a boundary",
	},
	nu: {
		type: "proportion",
		desc: "Proportion of objects managed by this server",
	},
	n: {
		type: "count",
		desc: "Number of objects managed by this server",
	}
}