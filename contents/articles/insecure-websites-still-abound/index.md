---
title: Insecure Websites Still Abound
author: Matt
date: 2015-05-09
template: article.jade
---

It's 2015, why is web security *still* so hit and miss?

<span class="more"></span>

I recently bought a Mini Cooper. Fun little car! When my first statement came, I wanted to sign up to do my payments online.  

Whenever I sign up for a new website that will hold any kind of sensitive information I always kick the tires of the site a bit to get a sense of how well it is implemented. The first step is to follow the "forgot password?" procedure and see what they do.

In the case of the [Mini Cooper Owner's Lounge](https://ol.miniusa.com/) the forgot password procedure simply asks for your usename, zip code, date of birth and the last four digits of your social security number.

<img class="diagram" alt="mini password reset screenshot" src="miniPasswordReset.png" />

At first I figured surely they'd send me a password reset email after this. Nope, that's it! You can then proceed to change your password right then and there. So in the case of Mini USA, the only thing between my bank account and *anyone at all* is the last four digits of my SSN.

A lot of people know my SSN. As much as I hate that fact, it's true for all of us. And if someone really wanted to figure out my last four digits, it's pretty darn doable. Hell, I wouldn't be surprised at all if the Mini website has no measures to prevent brute force attacks, and there's only 10,000 possibilities.

I contacted Mini USA and they insist their website is secure. So I will be mailing my payments in the old fashioned way, which sucks.

## Let's Get Past This!

Ugh, it is 2015 everybody! Why is this still an issue? Why are there still so many websites out there that get this *so* wrong? Why are software developers seemingly the only people that care about this?

## When Making a Website

If you're making a website, your best course of action is to avoid sensitive information and security as much as possible. Leave it to the experts. Don't store bank account info or credit card numbers, let vetted companies do it for you. And if you really must do it, hire someone who knows their stuff and will do it right.

Don't roll your own authentication system, learn a little bit about encryption, and offer [2 step verification](http://www.brool.com/index.php/using-google-authenticator-for-your-website) (Google makes it so easy!)

Don't store passwords in plaintext or in a way that makes them easily recoverable. Try really hard to just not store passwords at all!

And for the love of all things that are holy, do not add "security" questions!

Oh and one more thing, please consider running your entire site over TLS (aka SSL, https).

## When Using Websites

I highly recommend using a password manager that will enable you to easily have a different long, difficult password for all of your sites.  

If a website has "security" questions, treat them like additional passwords. I have my password manager generate passwords as answers to these questions, and store them in the manager. Sorry websites, figuring out the color of my first car is not that hard!

I also memorize my credit card number. I realize that's a little on the hardcore side, but I never have to have websites store it, and that's a nice added level of comfort for paranoid ol' me.

## Phew

This is a huge pet peeve of mine. So thanks for reading through my rant. Maybe we'll figure this out within the next decade or so ...
