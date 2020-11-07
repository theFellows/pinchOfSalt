'use strict';

const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');
const { request, response } = require('express');
require('dotenv').config();
const methodOverride = require('method-override');
const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(methodOverride('_method'));
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
const client = new pg.Client(DATABASE_URL);
let randomRecipes = [];
client.connect().then(() => {
    app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
}).catch(handleError);

app.get('/', getRandomRecipes);
app.post('/searches', getDataFromApi);
app.get('/details/:id',getById)

function getById(request,response){
    let id = request.params.id;
    let urlById = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;

    superagent.get(urlById).then(data => {
        let result = data.body.meals.map(element => {
            return new RecipeDetails(element)
        });
        response.render('pages/searches/detail', {
            recipesDetails: result
        });
    })
}

function getRandomRecipes(request, response) {
    let urls = [`https://www.themealdb.com/api/json/v1/1/random.php`, `https://www.themealdb.com/api/json/v1/1/random.php`,
        `https://www.themealdb.com/api/json/v1/1/random.php`, `https://www.themealdb.com/api/json/v1/1/random.php`,
        `https://www.themealdb.com/api/json/v1/1/random.php`, `https://www.themealdb.com/api/json/v1/1/random.php`]

    for (let i = 0; i < 6; i++) {
        superagent.get(urls[i]).then(data => {
            data.body.meals.map(element => {
                randomRecipes.push(new Recipes(element))
            });
        }).catch(handleError);
    }

    if (randomRecipes.length > 7) {
        randomRecipes = [];
    }

    response.render('pages/index', {
        recipesRandomly: randomRecipes
    });
}

function getDataFromApi(request, response) {
    let searchKey = request.body.search;
    let sortBy = request.body.sort;
    let url;
    if (sortBy === 'name') {
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${searchKey}`
    } else if (sortBy === 'category') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${searchKey}`
    } else if (sortBy === 'area') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${searchKey}`
    }

    superagent.get(url).then(data => {
        let result = data.body.meals.map(element => {
            return new Recipes(element)
        });
        response.render('pages/searches/show', {
            recipesDetails: result
        });
    }).catch(handleError);
}

function homePage(request, response) {
    response.render('pages/index');
}

function Recipes(data) {
    this.id = data.idMeal || 'No ID Available';
    this.name = data.strMeal || 'No Name Available';
    this.image_url = data.strMealThumb || 'No Image Available';
}

function RecipeDetails(data) {
    this.id = data.idMeal || 'No ID Available';
    this.name = data.strMeal || 'No Name Available';
    this.category = data.strCategory || 'No category Available'
    this.area = data.strArea || 'No Origin Available';
    this.image_url = data.strMealThumb || 'No Image Available';
    this.video_url = data.strYoutube.replace("watch", "embed") || 'No Video Available';
    this.instructions = data.strInstructions || 'No instructions Available';
    this.ingredients = getIngrArr(data) || 'No Ingredients Available';
}

function handleError() {
    response.status(500).send('Something Went Wrong');
}

//helper functions
function getIngrArr(data) {
    let ingredientsPicture = [];
    let ingredientsMeasure = [];
    for (let i = 0; i < 20; i++) {
        ingredientsPicture[i] = `${data[`strIngredient${i + 1}`]}`;
        ingredientsMeasure[i] = `${data[`strMeasure${i + 1}`]}`;
    }
    let newIngredients = ingredientsPicture.filter(value => {
        if (value != '  ' && value != 'null null' && value != ' ') {
            return (value);
        }
    })
    let newIngredientsMeasure = ingredientsMeasure.filter(value => {
        if (value != '  ' && value != 'null null' && value != ' ') {
            return (value);
        }
    })
    return ({
        ingredientsPicture : newIngredients,
        ingredientsMeasure : newIngredientsMeasure
    });
}

