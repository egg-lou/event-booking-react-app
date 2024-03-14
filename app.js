const express = require('express');
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrpyt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.use(
    '/graphql',
    graphqlHTTP({
        schema: buildSchema(`

        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery,
            mutation: RootMutation
        }
    `),
        rootValue: {
            events: async () => {
                try {
                    const events = await Event.find();
                    return events.map((event) => {
                        return { ...event._doc, _id: event._id };
                    });
                } catch (err) {
                    throw err;
                }
            },
            createEvent: async (args) => {
                const event = new Event({
                    title: args.eventInput.title,
                    description: args.eventInput.description,
                    price: +args.eventInput.price,
                    date: new Date(args.eventInput.date)
                });
                try {
                    const result = await event.save();
                    return { ...result._doc, _id: event._id };
                } catch (err) {
                    throw err;
                }
            },
            createUser: async (args) => {
                try {
                    const existingUser = await User.findOne({
                        email: args.userInput.email
                    });
                    if (existingUser) {
                        throw new Error('User exists already.');
                    }
                } catch (err) {
                    throw err;
                }

                try {
                    const hashedPassword = await bcrpyt.hash(
                        args.userInput.password,
                        12
                    );
                    const user = new User({
                        email: args.userInput.email,
                        password: hashedPassword
                    });
                    const result = await user.save();
                    return { ...result._doc, _id: user._id, password: null};
                } catch (err) {
                    throw err;
                }
            }
        },
        graphiql: true
    })
);

mongoose
    .connect(
        `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@events-panner.k4rurro.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=events-panner`
    )
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server started on port http://localhost:${PORT}`);
            console.log('Connected to MongoDB');
        });
    })
    .catch((err) => {
        console.log(err);
        throw err;
    });
