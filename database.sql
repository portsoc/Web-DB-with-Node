-- database setup in MySQL:

create user dbprinHappyShop@localhost identified by 'weiothbgdls';
create database dbprinHappyShop;
grant select, insert, update on dbprinHappyShop.* to dbprinHappyShop@localhost;
use dbprinHappyShop;

drop table if exists OrderLine;
drop table if exists `Order`;
drop table if exists Customer;
drop table if exists Product;
drop table if exists Supplier;
drop table if exists Category;

create table if not exists Category (
    id       varchar(8)  primary key,
    name     varchar(20) not null,
    priority double      not null unique,
    key(priority, name) -- so that we can order by the index
) engine=InnoDB;

create table if not exists Supplier (
    id   int         primary key auto_increment,
    name varchar(30) not null
    -- probably also some contact details but that's not necessary in the demo
) engine=InnoDB;

create table if not exists Product (
    id          int                 primary key auto_increment,
    name        varchar(30)         not null,
    price       decimal(8,2)        not null,
    description text,
    stock       mediumint unsigned  not null default 0,
    category    varchar(8)          not null,
    constraint foreign key (category) references Category(id),
    supplier    int,
    constraint foreign key (supplier) references Supplier(id)
) engine=InnoDB;

create table if not exists Customer (
    id      int          primary key auto_increment,
    name    varchar(40)  not null,
    address varchar(200) not null,
    unique key (name, address)
) engine=InnoDB;

create table if not exists `Order` (
    id         int           primary key auto_increment,
    customer   int           not null,
    constraint foreign key (customer) references Customer(id),
    date       datetime      not null, -- default now(),
    dispatched enum('y','n') not null default 'n'
) engine=InnoDB;

create table if not exists OrderLine (
    primary key (`order`, product),
    `order`  int,
    constraint foreign key (`order`) references `Order`(id),
    product  int,
    constraint foreign key (product) references Product(id),
    quantity mediumint unsigned not null,
    price    decimal(8,2)       not null
) engine=InnoDB;




-- sample data

insert into Category (id, name, priority) values
    ('cam', 'Cameras', 1), ('phone', 'Phones', 2), ('laptop', 'Laptops', 3);

insert into Supplier(id, name) values
    (1, 'Nixon Specialists Inc.'),
    (2, 'BigShop Inc.'),
    (3, 'Kaboodle Inc.'),
    (4, 'Oranges Pears etc. Ltd'),
    (5, 'Random Corp.');

insert into Product(id, name, price, description, stock, category, supplier) values
    (1, 'Nixon 123X',         123.45, 'A basic camera, 12.3MPix',                                    14, 'cam',    1),
    (2, 'Gunon P40E',         580.99, 'Body (no lenses), 40MPix',                                     2, 'cam',    2),
    (3, 'Gunon P30E',         399.99, 'Body (no lenses), 30MPix, discontinued',                       0, 'cam',    2),
    (4, 'Ace 4040',           349.99, '15" hi-res hi-perf with Windows',                              1, 'laptop', 2),
    (5, 'Leonvo Classic 386', 299.99, '13.3" flexible with Doors',                                   73, 'laptop', 2),
    (6, 'Lexus 1',            219.99, 'discontinued',                                                 0, 'phone',  3),
    (7, 'Lexus 5',            299.99, 'better, almost discontinued',                                  7, 'phone',  3),
    (8, 'flyPhone 7',        7399.90, 'not cheap but desirable',                                    137, 'phone',  4),
    (9, 'flyPhone 7+',     125999.90, 'honking big, newest and greatest',                            29, 'phone',  4),
    (10, 'example 1',         229.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 173, 'phone',  5),
    (11, 'example 2',         265.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 117, 'phone',  5),
    (12, 'example 3',         310.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 172, 'phone',  5),
    (13, 'example 4',          37.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 236, 'phone',  5),
    (14, 'example 5',          73.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 281, 'phone',  5),
    (15, 'example 6',         128.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 317, 'phone',  5),
    (16, 'example 7',         164.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',  44, 'phone',  5);

insert into Customer (id, name, address) values
    (1, 'Mr Anderson', '42 The Matrix'),
    (2, 'Ms Munchkin', '1 Yellow Brick Road, Ozshire');

insert into `Order` (id, customer, date) values
    (1, 1, now()),
    (2, 2, now());

insert into OrderLine (`order`, product, quantity, price) values
    (1, 5, 1, 320),
    (1, 2, 1, 599.99),
    (2, 5, 2, 310);
