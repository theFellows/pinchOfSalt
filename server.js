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
let randomlyRecips = [];
client.connect().then(() => {
    app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
}).catch(handleError);

app.get('/', homePage);
app.post('/searches' , getDataFromApi)
app.get('/random' , getRandomItem)

function getRandomItem(request,response) {
    let urls = [`https://www.themealdb.com/api/json/v1/1/random.php`,`https://www.themealdb.com/api/json/v1/1/random.php`,
    `https://www.themealdb.com/api/json/v1/1/random.php`,`https://www.themealdb.com/api/json/v1/1/random.php`,
    `https://www.themealdb.com/api/json/v1/1/random.php`,`https://www.themealdb.com/api/json/v1/1/random.php`]

    for(let i=0 ; i<6 ; i++) {
        superagent.get(urls[i]).then(data=>{
           data.body.meals.map(element => {
            randomlyRecips.push(new Recipes(element))
            });
        })
    }    

    if(randomlyRecips.length > 7) {
      randomlyRecips = [];
    }

    response.render('pages/index', {
        recipesRandomly: randomlyRecips
    });
}


function getDataFromApi(request,response) {
    let searchKey = request.body.search;
    let sortBy = request.body.sort;
    let url;
    if(sortBy === 'name') {
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${searchKey}`
    }else if(sortBy === 'category'){
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${searchKey}`
    }else if(sortBy === 'area'){
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${searchKey}`
    }

superagent.get(url).then(data=>{
    let result = data.body.meals.map(element => {
            return new Recipes(element)
    });
    response.render('pages/searches/show', {
        recipesDetails: result
    });
})
}

function homePage(request, response) {
    response.render('pages/index');
}

function Recipes(data) {
this.name = data.strMeal;
this.category = data.strCategory;
this.area = data.strArea;
this.image_url = data.strMealThumb;
this.video_url = data.strYoutube;
this.instructions = data.strInstructions;
}

function handleError() {
    response.status(500).send('Something Went Wrong');
}
